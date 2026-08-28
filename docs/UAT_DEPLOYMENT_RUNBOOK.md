# FollowMee closed-UAT deployment runbook

This runbook is for a free-tier, non-commercial UAT with 3–5 invited testers. It is not the production runbook.

## Release boundary

- Source branch: `deploy_uat`; รับเฉพาะ UAT PR ที่ผ่าน CI จาก `dev` และส่งต่อไป `master` เมื่อ UAT ผ่าน
- Frontend: Vercel UAT deployment from `deploy_uat` (อาจ promote เป็น public UAT alias เพื่อให้ social crawler เข้าถึงได้)
- Backend: Render Free service created from `render.uat.yaml`.
- Database: an isolated TiDB Starter database. `DB_NAME=followmee` is rejected by `npm run start:uat`.
- Custom domains remain disabled. Use synthetic or explicitly consented UAT data only.

## 1. TiDB Starter

1. Create an isolated cluster/database and record its Connect values in Render secrets only.
2. Set TLS and the plan's documented storage limit (`TIDB_STORAGE_LIMIT_BYTES=5368709120`). Keep `TIDB_STORAGE_USAGE_CONFIRMED=false` until the measured value is proven to match the provider's billed quota; storage percentage and RU usage otherwise remain provider-dashboard-only.
3. Export the empty/bootstrap database before migration and retain its checksum outside Git.
4. Run the complete ordered migration chain through the UAT Render start command. Confirm the ledger includes `UatAccessPrivacyCapacity1854000000000` and `RegistrationVerificationIndex1855000000000`.
5. Run FK/index/transaction smoke checks. Never import, seed, reset or test against `followmee`.

## 2. Render UAT backend

Create a Blueprint from `render.uat.yaml`, then provide all `sync: false` values. Public registration fails closed unless controller identity, policy date, Turnstile, analytics salt and email delivery are configured.
Set `BOOTSTRAP_OWNER_EMAIL` to the real inbox of the intended first Owner. On an empty
database that address registers normally, verifies through SendGrid and atomically becomes
the singleton Owner. Afterward it has no bootstrap privilege and all public registrations
wait for Owner approval. Never use a shared/default password in Render environment values.

Confirm:

- `/health` returns `UP` after a cold start.
- exact Vercel Preview origins are present in `CORS_PREVIEW_ORIGINS`.
- signup creates a pending request, not a User; email verification moves it to Owner approval.
- Socket.IO reconnects after the Render Free instance wakes.
- no secret, raw IP or PII appears in logs.

If active users exist but `system_owner` is missing, registration returns
`OWNER_RECOVERY_REQUIRED`. Stop public signup, verify the database backup, and use the
audited `owner:transfer` recovery command; never let another public registrant claim Owner.

Render health checks query the database. A transient database outage causes bounded
connection retries followed by process exit so Render can restart cleanly. Schema/data
recovery is never automatic: restore to a separate database, verify checksums and migrations,
then switch the connection deliberately.

Render Free can sleep after inactivity. The UAT invitation must explain the possible wake-up delay.

## 3. Vercel UAT

Set UAT frontend values: API/WS URLs, registration flag, Turnstile site key and the public privacy-controller fields. Do not place server secrets or TiDB credentials in `VITE_*`.

Vercel project production branch remains `master`. Build `deploy_uat` as Preview first; when crawler access is required on Hobby, promote only the verified `deploy_uat` commit to the temporary public UAT alias and record that promotion. A later `master` release supersedes it.

After deployment:

```powershell
npm run verify:preview -- https://<preview-host> <published-slug> index
```

Inspect raw HTML with JavaScript disabled. Confirm exactly one title, canonical, robots, Open Graph/Twitter fields and a PNG OG image. Then test Facebook, LinkedIn, LINE and X/Twitter using their real sharing/debug tools. If deployment protection blocks crawlers, use a temporary approved UAT URL; do not weaken production access controls.

The Vite SPA fallback must exclude `/api/`; otherwise the catch-all rewrite
serves `index.html` instead of the profile metadata and OG-image Functions.
The metadata Function first reads a packaged `dist/index.html`; when Vercel
preserves the repository root in the Function bundle, it also checks
`Frontend/dist/index.html`. Only when neither packaged location exists does it
fetch the deployment's own `/index.html` with the same bounded timeout before
injecting metadata.
The `/api/profile-og` Function uses Vercel's Edge runtime so `@vercel/og` can
return a 1200×630 PNG without relying on Node-only WASM packaging.

## 4. UAT script and exit gate

Each tester completes without guidance:

`Landing → Demo → Register → Verify email → Owner approval → Quick-create → Draft → Publish → Share`

Also cover Lead realtime/inbox/convert, duplicate dialogs, broken-link warnings, revisions, CSV and scheduling. Product funnel events are recorded only after Analytics opt-in; crawler/demo profile traffic is excluded from profile analytics.

Exit only when at least 80% publish without help, no P0/P1 remains, Lead realtime works, unexplained stage loss stays below 50%, and accessibility/performance gates pass. Record cold starts and provider-dashboard quota observations in the UAT log without copying secrets.

## 5. Capacity response

`GET /api/system/capacity` is available to Owner/Admin/Moderator. Exact metrics generate deduplicated 70/85/95/100 notifications; provider-only metrics display a dashboard link and never invent a percentage. At 95% the app shows a persistent banner. Provider-native email/dashboard notifications remain the source of truth for Vercel/Render/TiDB quotas not exposed through reliable APIs.

If a provider pauses the service, communicate a maintenance window and preserve data. Do not reset the database or silently disable writes.
