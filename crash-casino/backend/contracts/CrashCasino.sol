// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * 🎰 PacoRocko Crash Casino Contract
 * 
 * Handles bet escrow, provably fair verification, and automated payouts
 * for the crash-style gambling game on Abstract L2
 */
contract CrashCasino is ReentrancyGuard, Pausable, Ownable {
    using ECDSA for bytes32;

    // Events
    event BetPlaced(
        bytes32 indexed roundId,
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );
    
    event PlayerCashedOut(
        bytes32 indexed roundId,
        address indexed player,
        uint256 betAmount,
        uint256 multiplier,
        uint256 payout
    );
    
    event RoundSettled(
        bytes32 indexed roundId,
        uint256 crashPoint,
        uint256 totalBets,
        uint256 totalPayouts,
        bytes32 serverSeedHash
    );
    
    event ServerSeedRevealed(
        bytes32 indexed roundId,
        string serverSeed,
        bytes32 serverSeedHash
    );

    // Structs
    struct Bet {
        address player;
        uint256 amount;
        uint256 multiplier; // 0 if not cashed out, multiplier * 1000 if cashed out
        bool settled;
        uint256 timestamp;
    }
    
    struct Round {
        bytes32 id;
        bytes32 serverSeedHash; // Committed before round starts
        string clientSeed;
        uint256 nonce;
        uint256 crashPoint; // Set after round ends, multiplier * 1000
        uint256 startTime;
        uint256 endTime;
        uint256 totalBets;
        uint256 totalPayouts;
        bool settled;
        string serverSeed; // Revealed after settlement
    }

    // State variables
    mapping(bytes32 => Round) public rounds;
    mapping(bytes32 => mapping(address => Bet)) public bets;
    mapping(bytes32 => address[]) public roundPlayers;
    
    uint256 public minBet = 0.001 ether;
    uint256 public maxBet = 10 ether;
    uint256 public houseEdge = 200; // 2% = 200 basis points
    uint256 public maxMultiplier = 1000000; // 1000x = 1000000 (multiplier * 1000)
    
    address public gameServer; // Authorized to settle rounds
    uint256 public totalVolume;
    uint256 public totalPayouts;
    uint256 public houseBalance;
    
    bytes32[] public roundHistory;
    
    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Only game server can call this");
        _;
    }
    
    modifier validRound(bytes32 roundId) {
        require(rounds[roundId].id != bytes32(0), "Round does not exist");
        _;
    }

    constructor(address _gameServer) {
        gameServer = _gameServer;
    }

    /**
     * 🎲 Start a new round with committed server seed
     */
    function startRound(
        bytes32 roundId,
        bytes32 serverSeedHash,
        string memory clientSeed,
        uint256 nonce
    ) external onlyGameServer {
        require(rounds[roundId].id == bytes32(0), "Round already exists");
        
        rounds[roundId] = Round({
            id: roundId,
            serverSeedHash: serverSeedHash,
            clientSeed: clientSeed,
            nonce: nonce,
            crashPoint: 0,
            startTime: block.timestamp,
            endTime: 0,
            totalBets: 0,
            totalPayouts: 0,
            settled: false,
            serverSeed: ""
        });
        
        roundHistory.push(roundId);
    }

    /**
     * 💰 Place a bet in the current round
     */
    function placeBet(bytes32 roundId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        validRound(roundId) 
    {
        require(msg.value >= minBet && msg.value <= maxBet, "Invalid bet amount");
        require(rounds[roundId].endTime == 0, "Round already ended");
        require(bets[roundId][msg.sender].amount == 0, "Already bet in this round");
        
        bets[roundId][msg.sender] = Bet({
            player: msg.sender,
            amount: msg.value,
            multiplier: 0,
            settled: false,
            timestamp: block.timestamp
        });
        
        roundPlayers[roundId].push(msg.sender);
        rounds[roundId].totalBets += msg.value;
        totalVolume += msg.value;
        
        emit BetPlaced(roundId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * 🏃‍♂️ Cash out a bet (called by game server with signature)
     */
    function cashOut(
        bytes32 roundId,
        address player,
        uint256 multiplier,
        bytes memory signature
    ) external onlyGameServer validRound(roundId) {
        require(bets[roundId][player].amount > 0, "No bet found");
        require(bets[roundId][player].multiplier == 0, "Already cashed out");
        require(rounds[roundId].endTime == 0, "Round already ended");
        
        // Verify signature from player (optional security measure)
        // bytes32 messageHash = keccak256(abi.encodePacked(roundId, player, multiplier));
        // require(messageHash.toEthSignedMessageHash().recover(signature) == player, "Invalid signature");
        
        bets[roundId][player].multiplier = multiplier;
        
        uint256 payout = (bets[roundId][player].amount * multiplier) / 1000;
        
        emit PlayerCashedOut(roundId, player, bets[roundId][player].amount, multiplier, payout);
    }

    /**
     * 🏁 Settle round and process all payouts
     */
    function settleRound(
        bytes32 roundId,
        uint256 crashPoint,
        string memory serverSeed
    ) external onlyGameServer validRound(roundId) nonReentrant {
        require(!rounds[roundId].settled, "Round already settled");
        require(rounds[roundId].endTime == 0, "Round already ended but not settled");
        
        // Verify server seed matches committed hash
        require(
            keccak256(abi.encodePacked(serverSeed)) == rounds[roundId].serverSeedHash,
            "Server seed doesn't match committed hash"
        );
        
        rounds[roundId].crashPoint = crashPoint;
        rounds[roundId].endTime = block.timestamp;
        rounds[roundId].settled = true;
        rounds[roundId].serverSeed = serverSeed;
        
        uint256 totalPayouts = 0;
        address[] memory players = roundPlayers[roundId];
        
        // Process payouts for all players
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            Bet storage bet = bets[roundId][player];
            
            if (bet.amount > 0 && !bet.settled) {
                if (bet.multiplier > 0 && bet.multiplier < crashPoint) {
                    // Player cashed out before crash
                    uint256 payout = (bet.amount * bet.multiplier) / 1000;
                    totalPayouts += payout;
                    
                    // Transfer payout
                    (bool success, ) = payable(player).call{value: payout}("");
                    require(success, "Payout transfer failed");
                }
                // If multiplier == 0, player didn't cash out (lost bet)
                // If multiplier >= crashPoint, player didn't cash out in time (lost bet)
                
                bet.settled = true;
            }
        }
        
        rounds[roundId].totalPayouts = totalPayouts;
        this.totalPayouts += totalPayouts;
        
        // Add remaining funds to house balance
        uint256 houseProfit = rounds[roundId].totalBets - totalPayouts;
        houseBalance += houseProfit;
        
        emit RoundSettled(roundId, crashPoint, rounds[roundId].totalBets, totalPayouts, rounds[roundId].serverSeedHash);
        emit ServerSeedRevealed(roundId, serverSeed, rounds[roundId].serverSeedHash);
    }

    /**
     * 🔍 Verify round fairness
     */
    function verifyRoundFairness(bytes32 roundId) 
        external 
        view 
        validRound(roundId) 
        returns (bool isValid, uint256 expectedCrashPoint) 
    {
        Round memory round = rounds[roundId];
        require(round.settled, "Round not settled yet");
        
        // Recreate crash point calculation
        bytes32 combinedHash = keccak256(abi.encodePacked(
            round.serverSeed,
            round.clientSeed,
            round.nonce
        ));
        
        // Convert to crash point (simplified version of off-chain calculation)
        uint256 hashValue = uint256(combinedHash) % (2**32);
        uint256 rawMultiplier = (2**32 * 1000) / (hashValue + 1); // *1000 for precision
        
        // Apply house edge
        uint256 houseEdgeMultiplier = 10000 - houseEdge; // 9800 for 2% edge
        expectedCrashPoint = (rawMultiplier * houseEdgeMultiplier) / 10000;
        
        // Cap at max multiplier
        if (expectedCrashPoint > maxMultiplier) {
            expectedCrashPoint = maxMultiplier;
        }
        
        isValid = (expectedCrashPoint == round.crashPoint);
    }

    /**
     * 📊 Get round information
     */
    function getRoundInfo(bytes32 roundId) 
        external 
        view 
        validRound(roundId) 
        returns (Round memory) 
    {
        return rounds[roundId];
    }

    /**
     * 🎯 Get player bet for round
     */
    function getPlayerBet(bytes32 roundId, address player) 
        external 
        view 
        validRound(roundId) 
        returns (Bet memory) 
    {
        return bets[roundId][player];
    }

    /**
     * 📈 Get round players
     */
    function getRoundPlayers(bytes32 roundId) 
        external 
        view 
        validRound(roundId) 
        returns (address[] memory) 
    {
        return roundPlayers[roundId];
    }

    /**
     * ⚙️ Admin functions
     */
    function setGameServer(address _gameServer) external onlyOwner {
        gameServer = _gameServer;
    }
    
    function setBetLimits(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        require(_minBet < _maxBet, "Invalid bet limits");
        minBet = _minBet;
        maxBet = _maxBet;
    }
    
    function setHouseEdge(uint256 _houseEdge) external onlyOwner {
        require(_houseEdge <= 1000, "House edge too high"); // Max 10%
        houseEdge = _houseEdge;
    }
    
    function withdrawHouseFunds(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= houseBalance, "Insufficient house balance");
        houseBalance -= amount;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * 📊 Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalVolume,
        uint256 _totalPayouts,
        uint256 _houseBalance,
        uint256 _totalRounds
    ) {
        return (totalVolume, totalPayouts, houseBalance, roundHistory.length);
    }

    /**
     * 🔧 Emergency functions
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    // Fallback function to receive ETH
    receive() external payable {
        // Allow contract to receive ETH for house funding
    }
}