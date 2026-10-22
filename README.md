# MediSafe

MediSafe is a prototype mental-wellness companion and clinician portal. It contains seeded sample records; do not use it with real patient data or for clinical care until persistence and crisis-safety behavior have been reviewed and completed.

## Development

This repository pins pnpm in `package.json` and includes a `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
```

Configure the environment values required by the server before using database or AI integrations.

## Accounts and sessions

Sign-in is local and does not need an identity provider: create an account on `/login` (patient or doctor), or use **Continue with demo access** for a read-only demo patient session.

- Passwords are salted scrypt hashes stored in `uploads/accounts.json` (git-ignored).
- Sessions are HS256 JWTs in an `HttpOnly` cookie, signed with `JWT_SECRET` when set or with a secret persisted to `uploads/.session-secret`.
- Every patient-data route requires a session. Patient accounts may only read their own linked profile; the patient directory, `assessments.listAll`, and `prescriptions.listAll` are clinician-only.
- Patient accounts are linked to the seeded demo profile (patient id 1), so a new patient account sees seeded sample records rather than their own.

Browser/session debug collection has been removed from the project; no telemetry script is served or injected.
