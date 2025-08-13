### Security & Abuse-Resistance

- Idempotency keys on bet placement and payout rows.
- HMAC on server-to-server webhooks; store shared secret in env.
- zod validation on all API bodies.
- Velocity limits: rate-limit bets per user, cooldown windows.
- KYB/KYC toggles via env flag; optional geo/IP denylist.
- Key rotation plan for house wallet; rotate service keys quarterly.
- 2FA for operator panel; operator role in Supabase RLS.


