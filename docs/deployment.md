# Deployment Guide

## Environment

- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)
- **Triggers**: Push to `main` branch or manual workflow dispatch

## Required Secrets (GitHub Settings > Secrets)

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `VITE_AZURE_CLIENT_ID` | Azure AD application (client) ID |
| `VITE_AZURE_TENANT_ID` | Azure AD directory (tenant) ID |
| `VITE_REDIRECT_URI` | OAuth redirect URI (your GitHub Pages URL) |
| `VITE_PHI_ENCRYPTION_KEY` | AES-256 key for PHI encryption |
| `VITE_SUPER_ADMIN_PASSWORD` | Super admin login password |
| `VITE_DEFAULT_USER_PASSWORD` | Default password for bulk-created users |

## Pipeline Steps

1. **Checkout** — clone the repository
2. **Setup Node** — Node.js 20
3. **Install** — `npm ci` (clean install from lockfile)
4. **Lint** — `npm run lint` (blocks deploy on lint errors)
5. **Test** — `npm test` (blocks deploy on test failures)
6. **Build** — `vite build` with secrets injected as env vars
7. **Deploy** — Upload `dist/` to GitHub Pages

## Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in your values in .env

# Start dev server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Production build
npm run build
```

## Troubleshooting

### Build fails with missing env vars
Ensure all `VITE_*` secrets are configured in GitHub repository settings. The build will succeed without them but the app will fail at runtime.

### MSAL redirect loop
Verify `VITE_REDIRECT_URI` matches exactly what's configured in Azure AD app registration (including trailing slash).

### Supabase connection fails
Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct. The app will fall back to offline cached data if Supabase is unreachable.
