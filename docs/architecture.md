# System Architecture

## Overview

Tristar PT Reimbursement Calculator is a single-page React application deployed to GitHub Pages. It uses Supabase as its backend (PostgreSQL + REST API) and Azure AD for enterprise SSO authentication.

## System Diagram

```
Browser (React SPA)
  |
  +-- Azure AD (MSAL) -----> Microsoft Identity Platform
  |
  +-- Supabase Client -----> Supabase (PostgreSQL)
  |                            - rates, payers, code_groups
  |                            - billing_entries, patients
  |                            - app_users, combos, activity_log
  |                            - providers, treatment_templates
  |
  +-- localStorage ---------> Offline cache (encrypted session)
  +-- sessionStorage -------> Session state
```

## Data Layer

### Primary Store: Supabase
All persistent data lives in Supabase PostgreSQL. The app loads data at startup into an in-memory cache (`adminDataStore.js`) and syncs writes back to Supabase immediately.

### Offline Fallback: localStorage
On successful load, the app serializes its cache to `trc_offline_data` and `trc_offline_store` in localStorage. If Supabase is unreachable (8-second timeout), the app falls back to this cached data.

### Session: sessionStorage
The current user session is stored in sessionStorage (`trc_session_v3`). This ensures the session is scoped to a single tab and cleared on tab close (HIPAA requirement).

## Authentication Flow

1. App initializes MSAL (Azure AD) in parallel with data loading
2. If MSAL returns an active account, the user is resolved against the `app_users` table
3. If no MSAL account, the user sees a local login form (bcryptjs password verification)
4. Admin emails are matched by username prefix to grant superadmin access
5. Role determines shell: `superadmin`/`admin` -> AdminShell, `staff` -> UserShell

## PHI Security

- Patient-identifiable fields (name, notes) are encrypted with AES-256-CBC before storage
- Encryption key is a build-time environment variable (`VITE_PHI_ENCRYPTION_KEY`)
- 15-minute inactivity timeout with 2-minute warning banner
- Activity logging tracks all logins, logouts, and data operations (no PHI in logs)

## Key Tables

| Table | Purpose |
|-------|---------|
| `rates` | CPT code reimbursement amounts per payer |
| `payers` | Insurance payer list with sort order |
| `code_groups` | Billing code categories (Therapeutic, Modalities, etc.) |
| `code_labels` | Human-readable descriptions for each code |
| `billing_rules` | Payer-specific billing restrictions |
| `billing_entries` | Logged visits (PHI encrypted) |
| `patients` | Patient directory (PHI encrypted) |
| `providers` | Clinician roster by location |
| `treatment_templates` | Preset code combinations for common diagnoses |
| `combos` | User-saved code combinations |
| `app_users` | Local user accounts with bcrypt passwords |
| `activity_log` | Audit trail of user actions |
| `contract_payers` | Fixed-rate payer contracts |
| `rate_changes` | Historical rate change audit trail |

## Deployment

GitHub Actions workflow on push to `main`:
1. Install dependencies (`npm ci`)
2. Run lint (`npm run lint`)
3. Run tests (`npm test`)
4. Build (`vite build`) with secrets injected as env vars
5. Deploy to GitHub Pages
