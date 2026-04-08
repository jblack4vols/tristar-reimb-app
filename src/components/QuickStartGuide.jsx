export default function QuickStartGuide() {
  return (
    <div>
      <div className="section-head">Quick Start Guide</div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
        Everything you need to know to get started with the Tristar PT Reimbursement Calculator.
      </div>

      {/* Getting Started */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          1. Logging In
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}><strong>Microsoft 365:</strong> Click "Sign in with Microsoft 365" on the login page. Uses your Tristar email.</p>
          <p style={{ marginBottom: 8 }}><strong>Username/Password:</strong> Use the credentials your administrator provided.</p>
          <p style={{ marginBottom: 0, color: '#9ca3af', fontSize: 13 }}>Sessions auto-expire after 15 minutes of inactivity for HIPAA compliance. You'll see a warning 2 minutes before.</p>
        </div>
      </div>

      {/* Log a Visit */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          2. Log a Patient Visit (Most Common Task)
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}><strong>Quick way:</strong> Click <strong>"New Visit"</strong> from the Home page or sidebar under Clinical.</p>
          <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>Search for the patient or click "Add New Patient"</li>
            <li style={{ marginBottom: 6 }}>Select the payer (auto-fills from patient record)</li>
            <li style={{ marginBottom: 6 }}>Pick a template OR select individual codes</li>
            <li style={{ marginBottom: 6 }}>Review the summary and total</li>
            <li style={{ marginBottom: 6 }}>Click <strong>"Log Visit"</strong></li>
          </ol>
          <p style={{ marginBottom: 0, color: '#9ca3af', fontSize: 13 }}>Tip: Use templates for common visits — they pre-fill all the codes for you.</p>
        </div>
      </div>

      {/* Calculator */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          3. Calculate Expected Reimbursement
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>Go to <strong>Clinical &gt; Calculator</strong></p>
          <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>Select your name as Provider (auto-fills if you're in the system)</li>
            <li style={{ marginBottom: 6 }}>Choose the insurance payer</li>
            <li style={{ marginBottom: 6 }}>Tap codes to add them — rates show instantly</li>
            <li style={{ marginBottom: 6 }}>See the total at the bottom</li>
          </ol>
          <p style={{ marginBottom: 8 }}><strong>Fee Schedule mode:</strong> Individual codes with per-code rates</p>
          <p style={{ marginBottom: 8 }}><strong>Contract mode:</strong> Flat per-visit rate (select payer and number of visits)</p>
          <p style={{ marginBottom: 0, color: '#9ca3af', fontSize: 13 }}>Tip: The 8-Minute Rule section auto-calculates billable units from treatment time.</p>
        </div>
      </div>

      {/* Patients */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          4. Managing Patients
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>Go to <strong>Clinical &gt; Patients</strong></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>Add patients with their name, payer, provider, and diagnosis</li>
            <li style={{ marginBottom: 6 }}>Click "Select" to jump to the calculator with that patient pre-filled</li>
            <li style={{ marginBottom: 6 }}>Patient names are encrypted for HIPAA compliance</li>
          </ul>
        </div>
      </div>

      {/* Visit History */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          5. Visit History
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>Go to <strong>History &gt; Visit History</strong></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>View all logged visits with date, payer, codes, and reimbursement totals</li>
            <li style={{ marginBottom: 6 }}>Use quick date range presets (Today, This Week, This Month, Last 90 Days, All Time)</li>
            <li style={{ marginBottom: 6 }}>Filter by payer, provider, or location</li>
            <li style={{ marginBottom: 6 }}>Summary cards show total revenue, average per visit, and average codes</li>
          </ul>
        </div>
      </div>

      {/* Templates */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          6. Treatment Templates
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>Go to <strong>Clinical &gt; Templates</strong></p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}>Pre-built code combinations for common diagnoses</li>
            <li style={{ marginBottom: 6 }}>Click "Apply" to load a template's codes into the calculator</li>
            <li style={{ marginBottom: 6 }}>Admins can create custom templates</li>
          </ul>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          7. Keyboard Shortcuts
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Ctrl + K', 'Search anywhere'],
                ['Ctrl + N', 'New Visit'],
                ['Ctrl + P', 'Patients'],
                ['Ctrl + B', 'Batch Entry'],
              ].map(([key, desc]) => (
                <tr key={key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: 700, width: 120 }}>
                    <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{key}</span>
                  </td>
                  <td style={{ padding: '8px 0' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Alerts */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#FF8200', marginBottom: 10 }}>
          8. Billing Alerts
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>The system automatically warns you about common billing issues:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#b71c1c' }}>Red alerts:</strong> Code not covered by payer, Aetna TA+MT conflict</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: '#e65100' }}>Yellow alerts:</strong> Wrong E-Stim code for Medicare, duplicate code families</li>
          </ul>
        </div>
      </div>

      {/* Need Help */}
      <div className="card-surface" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>💡</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Have a suggestion?</div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
          Click <strong>Feature Requests</strong> in the sidebar to submit ideas for improving this tool.
          Your feedback helps us make it better for everyone.
        </div>
      </div>
    </div>
  );
}
