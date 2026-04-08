# Code Standards

## Language & Framework

- JavaScript (ES2022) with JSX — no TypeScript
- React 18 with functional components and hooks only
- Vite 5 for build tooling

## File Organization

- Components: `src/components/` (PascalCase filenames matching export)
- Admin-only components: `src/components/admin/`
- Utilities: `src/utils/` (camelCase filenames)
- Static data: `src/data/`
- Tests: `src/__tests__/` (*.test.js suffix)

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Component files | PascalCase.jsx | `CalcView.jsx` |
| Utility files | camelCase.js | `billingOptimizer.js` |
| Test files | camelCase.test.js | `crypto.test.js` |
| React components | PascalCase | `function AdminShell()` |
| Hooks | camelCase with `use` prefix | `useAdminData` |
| Constants | UPPER_SNAKE_CASE | `BILLING_RULES` |
| State variables | camelCase | `[payer, setPayer]` |

## Component Guidelines

- One component per file
- Keep components under 300 lines; extract sub-components when exceeding
- Functional components with hooks only (no class components)
- Inline styles (project convention — no CSS modules, Tailwind, or styled-components)
- Brand color: `#FF8200` (Tristar orange)

## Hooks Rules

- All hooks must be called at the top level of the component — never after an early return
- Do not call hooks inside conditions, loops, or nested functions
- Custom hooks go in `src/utils/` with `use` prefix

## Security Rules (HIPAA)

- Never log PHI (patient names, DOB, diagnosis) to console or activity log
- Always encrypt PHI fields with `encryptPHI()` before database storage
- Always decrypt with `decryptPHI()` when reading for display
- Maintain 15-minute inactivity timeout — never increase or disable
- Minimum 10 bcrypt salt rounds for password hashing
- Never commit `.env` files

## State Management

- `src/utils/store.js` is the single source of truth
- `src/utils/adminDataStore.js` manages rate/payer/provider data with in-memory cache
- Components subscribe via `useAdminData()` hook
- Do not make direct Supabase calls from components (use store/adminDataStore)

## Linting

- ESLint 10 with flat config (`eslint.config.js`)
- `eqeqeq: error` — always use `===`/`!==`
- `no-var: error` — use `const`/`let`
- `prefer-const: warn` — use `const` when not reassigned
- `no-eval: error`, `no-implied-eval: error` — never use eval
- `no-console: warn` — use `console.warn`/`console.error` only

## Git Conventions

- Conventional commits enforced by commitlint
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Examples:
  - `feat(calc): add multi-visit projection`
  - `fix(auth): resolve MSAL redirect loop`
  - `test(crypto): add AES round-trip tests`
