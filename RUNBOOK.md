### Operations Runbook

House wallet:
- Set `HOUSE_WALLET_PRIVATE_KEY` and `HOUSE_WALLET_ADDRESS` in env.
- Keep hot balance below configured threshold; replenish manually from cold.

Services (Render):
- Main server (this app) runs the round engine and exposes `/proof/:roundId`.
- Background: start payout worker if needed or run inside same dyno via node cron.
- Deposit indexer: run separately if you want attribution via RPC scanning.

Risk limits:
- Configure env: `MAX_BET`, `MAX_LIABILITY_FACTOR`, `PER_USER_COOLDOWN_MS`.
- Pre-bet solvency enforced by backend before accepting bet.

Incidents:
- If reveal write fails, pause game: set `PAUSE_ENGINE=1` and restart.
- Use Supabase `payouts` to retry failed payouts; the worker is idempotent.


