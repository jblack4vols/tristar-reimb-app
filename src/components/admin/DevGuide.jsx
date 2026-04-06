export default function DevGuide({ user }) {
  if (user?.role !== 'superadmin') return null;

  return (
    <div>
      <div className="section-head">Developer Guide — How to Update This App</div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
        This guide is only visible to you (Super Admin). It explains exactly how to make changes to the Tristar PT Reimbursement Calculator.
      </div>

      {/* Overview */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Architecture Overview
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}><strong>Frontend:</strong> React 18 + Vite (static site)</p>
          <p style={{ marginBottom: 8 }}><strong>Database:</strong> Supabase (PostgreSQL) — project ref: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>qkdwondlzlsftungslnm</code></p>
          <p style={{ marginBottom: 8 }}><strong>Auth:</strong> Microsoft SSO (MSAL) + username/password (bcrypt hashed)</p>
          <p style={{ marginBottom: 8 }}><strong>Hosting:</strong> GitHub Pages with auto-deploy via GitHub Actions</p>
          <p style={{ marginBottom: 8 }}><strong>Domain:</strong> rcalc.tristarpt.com (CNAME → jblack4vols.github.io)</p>
          <p style={{ marginBottom: 0 }}><strong>Repo:</strong> github.com/jblack4vols/tristar-reimb-app</p>
        </div>
      </div>

      {/* Step 1 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Step 1 — Open the Project in VS Code
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>Open Terminal and run:</p>
          <pre style={{ background: '#1a1a1a', color: '#e5e5e5', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
{`cd ~/Desktop/tristar-reimb-app
code .`}
          </pre>
          <p style={{ marginTop: 8, marginBottom: 0, color: '#6b7280', fontSize: 13 }}>
            This opens the entire project in VS Code. If <code>code</code> command doesn't work, open VS Code manually and do File → Open Folder → select <code>tristar-reimb-app</code>.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Step 2 — Start the Dev Server (Preview Changes Locally)
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>In VS Code, open the terminal (Ctrl+` or Terminal → New Terminal) and run:</p>
          <pre style={{ background: '#1a1a1a', color: '#e5e5e5', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
{`npm run dev`}
          </pre>
          <p style={{ marginTop: 8, marginBottom: 8 }}>
            Open <strong>http://localhost:5173/</strong> in your browser. Changes you make to files will auto-refresh in the browser instantly (hot reload).
          </p>
          <p style={{ marginBottom: 0, color: '#6b7280', fontSize: 13 }}>
            Press Ctrl+C in the terminal to stop the dev server when done.
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Step 3 — Make Your Changes
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 12, fontWeight: 700 }}>Key folders:</p>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 12 }}>
            <tbody>
              {[
                ['src/components/', 'All UI components (pages, forms, cards)'],
                ['src/components/admin/', 'Admin-only components (Dashboard, RateManager, etc.)'],
                ['src/utils/', 'Business logic (store, crypto, Supabase client, billing optimizer)'],
                ['src/data/', 'Default/fallback data (rates, codes, providers)'],
                ['src/index.css', 'All styles (CSS)'],
                ['src/App.jsx', 'Main app — login, routing, session management'],
                ['index.html', 'HTML entry point'],
                ['vite.config.js', 'Build configuration'],
                ['.github/workflows/deploy.yml', 'Auto-deploy pipeline'],
                ['public/', 'Static files (manifest, service worker, icons)'],
              ].map(([path, desc]) => (
                <tr key={path} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{path}</td>
                  <td style={{ padding: '6px 8px', color: '#6b7280' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginBottom: 12, fontWeight: 700 }}>Common changes:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 6 }}><strong>Add a new rate/code:</strong> Admin → Rates tab in the app (no code change needed)</li>
            <li style={{ marginBottom: 6 }}><strong>Add a new payer:</strong> Admin → Payers tab in the app</li>
            <li style={{ marginBottom: 6 }}><strong>Add a new provider:</strong> Admin → Providers tab in the app</li>
            <li style={{ marginBottom: 6 }}><strong>Change styles:</strong> Edit <code>src/index.css</code></li>
            <li style={{ marginBottom: 6 }}><strong>Change header:</strong> Edit <code>src/components/Header.jsx</code></li>
            <li style={{ marginBottom: 6 }}><strong>Change login page:</strong> Edit <code>src/components/LoginScreen.jsx</code></li>
            <li style={{ marginBottom: 6 }}><strong>Change calculator:</strong> Edit <code>src/components/CalcView.jsx</code></li>
            <li style={{ marginBottom: 6 }}><strong>Change sidebar:</strong> Edit <code>src/components/Sidebar.jsx</code></li>
            <li style={{ marginBottom: 6 }}><strong>Add a new page:</strong> Create a new .jsx file in <code>src/components/</code>, import it in AdminShell.jsx or UserShell.jsx, add a tab entry in Sidebar.jsx</li>
          </ul>
        </div>
      </div>

      {/* Step 4 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Step 4 — Test Your Changes
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>Make sure the dev server is running and check your changes in the browser at localhost:5173.</p>
          <p style={{ marginBottom: 8 }}>Build to check for errors:</p>
          <pre style={{ background: '#1a1a1a', color: '#e5e5e5', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
{`npm run build`}
          </pre>
          <p style={{ marginTop: 8, marginBottom: 0, color: '#6b7280', fontSize: 13 }}>
            If the build fails, it will show you the exact file and line number with the error. Fix it and run again.
          </p>
        </div>
      </div>

      {/* Step 5 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Step 5 — Deploy to Production
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>Once your changes look good, commit and push to GitHub. This automatically deploys to rcalc.tristarpt.com:</p>
          <pre style={{ background: '#1a1a1a', color: '#e5e5e5', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
{`# Stage all changes
git add -A

# Commit with a description of what you changed
git commit -m "Description of what you changed"

# Push to GitHub (triggers auto-deploy)
git push`}
          </pre>
          <p style={{ marginTop: 8, marginBottom: 8 }}>
            The deploy takes about 1-2 minutes. Check status at: <strong>GitHub repo → Actions tab</strong>
          </p>
          <p style={{ marginBottom: 0, color: '#6b7280', fontSize: 13 }}>
            After pushing, just refresh rcalc.tristarpt.com to see your changes live.
          </p>
        </div>
      </div>

      {/* Database Changes */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Database Changes (Supabase)
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>If you need to add a new table or column:</p>
          <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>Go to <strong>supabase.com</strong> → sign in → select the project</li>
            <li style={{ marginBottom: 6 }}>Go to <strong>SQL Editor</strong></li>
            <li style={{ marginBottom: 6 }}>Write your SQL (e.g., <code>ALTER TABLE patients ADD COLUMN phone TEXT DEFAULT '';</code>)</li>
            <li style={{ marginBottom: 6 }}>Click <strong>Run</strong></li>
            <li style={{ marginBottom: 6 }}>Save the SQL as a migration file in the project: <code>supabase-migration-N.sql</code></li>
          </ol>
          <p style={{ marginBottom: 12, fontWeight: 700 }}>Current tables:</p>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['rates', 'Reimbursement rates (code + payer + amount)'],
                ['payers', 'Fee-schedule insurance payers'],
                ['contract_payers', 'Contract/day-rate payers'],
                ['providers', 'Therapists by location'],
                ['billing_rules', 'Per-payer billing warnings'],
                ['code_labels', 'CPT code descriptions'],
                ['code_groups', 'Code categories for UI grouping'],
                ['app_users', 'Staff/admin user accounts'],
                ['combos', 'Saved code combinations'],
                ['activity_log', 'Audit trail of all actions'],
                ['billing_entries', 'Logged patient visits (PHI encrypted)'],
                ['patients', 'Patient directory (names encrypted)'],
                ['authorizations', 'Visit authorizations per patient'],
                ['treatment_templates', 'Pre-built code templates by diagnosis'],
                ['rate_changes', 'Audit trail of rate edits'],
                ['email_queue', 'Queued welcome emails'],
                ['feature_requests', 'User feature suggestions'],
              ].map(([table, desc]) => (
                <tr key={table} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{table}</td>
                  <td style={{ padding: '6px 8px', color: '#6b7280' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Environment & Credentials */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Credentials & Config
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Supabase Project', 'qkdwondlzlsftungslnm'],
                ['Supabase URL', 'https://qkdwondlzlsftungslnm.supabase.co'],
                ['Azure AD Client ID', 'debda2f0-a35b-44c9-8e0b-9d1d306c49a8'],
                ['Azure AD Tenant ID', '668d2c67-481c-4c6c-8904-b08dfd68308c'],
                ['GitHub Repo', 'jblack4vols/tristar-reimb-app'],
                ['Live URL', 'https://rcalc.tristarpt.com'],
                ['Super Admin Login', 'jordan / Tristar2025!'],
                ['Default Staff Password', 'Tristar2026'],
                ['PHI Encryption Key', 'In src/utils/crypto.js'],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Using Claude Code */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Using Claude Code (AI Assistant)
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}>You can use Claude Code in VS Code to make changes with AI assistance:</p>
          <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>Open the project in VS Code</li>
            <li style={{ marginBottom: 6 }}>Open Claude Code panel (Cmd+Shift+P → "Claude Code")</li>
            <li style={{ marginBottom: 6 }}>Describe what you want to change in plain English</li>
            <li style={{ marginBottom: 6 }}>Claude will make the code changes for you</li>
            <li style={{ marginBottom: 6 }}>Test with <code>npm run dev</code></li>
            <li style={{ marginBottom: 6 }}>Deploy with <code>git add -A && git commit -m "message" && git push</code></li>
          </ol>
          <p style={{ marginBottom: 0, color: '#6b7280', fontSize: 13 }}>
            Examples: "Add a phone number field to the patient form", "Change the header color to blue", "Add a new template for shoulder surgery"
          </p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          Troubleshooting
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>App shows blank screen:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 4 }}>Open browser console (Cmd+Option+J) to see the error</li>
            <li style={{ marginBottom: 4 }}>Usually a JavaScript error — check the file and line number shown</li>
          </ul>

          <p style={{ marginBottom: 8, fontWeight: 700 }}>Changes don't appear after push:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 4 }}>Wait 1-2 minutes for GitHub Actions to finish</li>
            <li style={{ marginBottom: 4 }}>Hard refresh: Cmd+Shift+R</li>
            <li style={{ marginBottom: 4 }}>Clear service worker: DevTools → Application → Service Workers → Unregister</li>
          </ul>

          <p style={{ marginBottom: 8, fontWeight: 700 }}>Database error:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            <li style={{ marginBottom: 4 }}>Check Supabase dashboard → Table Editor to see if data exists</li>
            <li style={{ marginBottom: 4 }}>Check column names match between code and database</li>
            <li style={{ marginBottom: 4 }}>Check RLS policies in Supabase → Authentication → Policies</li>
          </ul>

          <p style={{ marginBottom: 8, fontWeight: 700 }}>npm install errors:</p>
          <pre style={{ background: '#1a1a1a', color: '#e5e5e5', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
{`# Delete node_modules and reinstall
rm -rf node_modules
npm install`}
          </pre>

          <p style={{ marginTop: 12, marginBottom: 8, fontWeight: 700 }}>Git push rejected:</p>
          <pre style={{ background: '#1a1a1a', color: '#e5e5e5', padding: 14, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.6 }}>
{`# Pull latest changes first, then push
git pull --rebase origin main
git push`}
          </pre>
        </div>
      </div>

      {/* HIPAA Reminder */}
      <div className="alert-warning" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>HIPAA Reminders</div>
        <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, lineHeight: 1.7 }}>
          <li>Patient names are encrypted with AES before storing in Supabase</li>
          <li>The encryption key is in <code>src/utils/crypto.js</code> — keep this file secure</li>
          <li>Never log patient names to the activity log or browser console</li>
          <li>Supabase Pro plan + BAA is required before storing real patient data</li>
          <li>Sessions auto-expire after 15 minutes of inactivity</li>
          <li>Passwords are bcrypt hashed — never stored in plain text</li>
        </ul>
      </div>
    </div>
  );
}
