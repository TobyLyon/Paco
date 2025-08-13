### Double-entry Ledger

Tables:
- ledger_entries(account enum('user','house'), user_id, delta_wei, ref_type, ref_id, created_at)

Invariant:
- Sum(house) + Sum(user) == hot_wallet_onchain ± pending.

Tests:
- Unit tests ensure every bet creates two entries and every payout creates two entries with equal magnitude and opposite sign.


