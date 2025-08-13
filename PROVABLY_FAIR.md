### Provably Fair: Commit-Reveal (No Contracts)

Protocol per round r:
- Before betting, server samples serverSeed (32-byte hex), sets nonce, computes H = sha256(serverSeed|r|nonce), stores H in Supabase `rounds.commit_hash` and broadcasts H.
- Clients place bets; server runs round.
- After crash, server reveals serverSeed, updates `rounds.seed_revealed`, and clients verify.

Crash mapping used by both server and verifier:
- hash = keccak256(serverSeed)
- r = (hash mod 2^52) / 2^52
- m = floor((100 * (1 - 0.01)) / max(r, 1e-12)) / 100
- m = clamp(m, 1.0, 1000.0) and round to 2 decimals.

Proof endpoint:
- GET `/proof/:roundId` returns serverSeed, commitHash, keccakOfSeed, crashMultiplier, and steps.

Failure policy:
- If reveal not written within N seconds after crash, engine auto-pauses, round voided, and bets refunded.


