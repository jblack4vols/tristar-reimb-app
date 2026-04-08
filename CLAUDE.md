# Tristar PT Reimbursement Calculator

## Project Overview

Internal tool for Tristar Physical Therapy to calculate insurance reimbursement rates, track visits, manage billing codes, and generate reports. Handles PHI (Protected Health Information) under HIPAA compliance requirements.

## Tech Stack

- **Frontend**: React 18.2 (JSX, no TypeScript)
- **Build**: Vite 5.1
- **Backend**: Supabase (PostgreSQL + Auth)
- **Auth**: Azure AD / MSAL SSO + local bcryptjs passwords
- **Encryption**: AES-256-CBC via crypto-js for PHI fields
- **Testing**: Vitest + Testing Library + jsdom
- **Linting**: ESLint 10 (flat config)
- **Deployment**: GitHub Pages via GitHub Actions

## Architecture

### Data Flow
```
Browser → MSAL (Azure AD SSO) → App
App → Supabase (primary data store)
App → localStorage (offline cache / fallback)
App → In-memory store (runtime cache)
```

### Key Patterns
- **Offline-first**: localStorage fallback when Supabase is unreachable; 8-second timeout on init
- **Role-based access**: `superadmin`, `admin`, `staff` — determines AdminShell vs UserShell
- **PHI encryption**: All patient-identifiable fields encrypted at rest via `src/utils/crypto.js`
- **HIPAA timeout**: 15-minute inactivity auto-logout with 2-minute warning banner

### Directory Structure
```
src/
├── App.jsx              # Root: auth flow, routing, HIPAA timeout
├── authConfig.js        # MSAL / Azure AD configuration
├── index.jsx            # React entry point
├── components/
│   ├── AdminShell.jsx   # Admin layout + navigation
│   ├── UserShell.jsx    # Staff layout + navigation
│   ├── LoginScreen.jsx  # Auth UI
│   ├── admin/           # Admin-only views (rates, payers, reports, billing rules)
│   └── *.jsx            # Shared components (visits, patients, calculators)
├── data/                # Static reference data (codes, providers, rates)
└── utils/
    ├── store.js         # Central data store (Supabase + localStorage sync)
    ├── supabase.js      # Supabase client init
    ├── crypto.js        # AES-256-CBC encryption/decryption for PHI
    ├── adminDataStore.js # Admin-specific data loading
    ├── billingOptimizer.js # Billing code optimization logic
    └── useAdminData.js  # React hook for admin data
```

## Development Rules

### HIPAA / Security (Non-Negotiable)
- **NEVER** log, console.log, or expose PHI (patient names, DOB, SSN, diagnosis) in plaintext
- **NEVER** commit `.env` files or hardcode secrets
- **ALWAYS** encrypt patient-identifiable fields using `crypto.js` before storing
- **ALWAYS** maintain the 15-minute inactivity timeout — do not increase or disable it
- **NEVER** disable or weaken bcrypt hashing (minimum 10 salt rounds)
- Validate all user inputs at form boundaries before storage

### Code Conventions
- Plain JavaScript (JSX) — no TypeScript in this project
- Functional components with hooks only (no class components)
- One component per file, filename matches export name (PascalCase for components)
- Utility files use camelCase filenames
- Inline styles are the existing pattern — maintain consistency (no CSS modules or Tailwind)
- Keep components under 300 lines; extract sub-components when exceeding
- Use `console.warn` and `console.error` only — `console.log` triggers lint warnings

### State Management
- `src/utils/store.js` is the single source of truth for data access
- Do not create parallel data stores or direct Supabase calls from components
- Session state lives in localStorage via `store.setSession()` / `store.getSession()`

### Testing
- Tests go in `src/__tests__/` with `.test.js` suffix
- Run tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Vitest with jsdom environment — `globals: true` so no need to import `describe`/`it`/`expect`

### Git & CI/CD
- Branch from `main`, PR back to `main`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- CI runs lint + test before deploy — failing either blocks deployment
- Never force-push to `main`

### Environment Variables
All prefixed with `VITE_` for Vite exposure to the client bundle:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase connection
- `VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID` — Azure AD SSO
- `VITE_REDIRECT_URI` — OAuth redirect
- `VITE_PHI_ENCRYPTION_KEY` — AES key for PHI encryption
- `VITE_SUPER_ADMIN_PASSWORD` / `VITE_DEFAULT_USER_PASSWORD` — Auth passwords

## Common Tasks

### Adding a new admin view
1. Create component in `src/components/admin/`
2. Add navigation entry in `AdminShell.jsx` and `AdminCombos.jsx`
3. Wire data through `store.js` or `useAdminData.js`

### Adding a new user-facing feature
1. Create component in `src/components/`
2. Add navigation entry in `UserShell.jsx` and `UserCombos.jsx`
3. Wire data through `store.js`

### Modifying billing logic
1. Check `src/utils/billingOptimizer.js` for calculation rules
2. Check `src/data/codes.js` and `src/data/rates.js` for reference data
3. Add tests in `src/__tests__/` for any new billing logic
