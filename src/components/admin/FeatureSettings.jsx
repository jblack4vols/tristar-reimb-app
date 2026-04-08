import { useState, useEffect } from 'react';
import { getSetting, setSetting } from '../../utils/adminDataStore';

const FEATURES = [
  {
    key: 'auto_suggest_codes',
    label: 'Auto-Suggest Missing Codes',
    description: 'When staff select billing codes, suggest additional codes they may be missing based on common billing patterns and visit history. Helps maximize reimbursement per visit.',
    default: true,
  },
];

export default function FeatureSettings({ user }) {
  const isSuperAdmin = user?.role === 'superadmin';
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const initial = {};
    FEATURES.forEach(f => {
      initial[f.key] = getSetting(f.key, f.default);
    });
    setSettings(initial);
  }, []);

  const toggleFeature = async (key) => {
    if (!isSuperAdmin) return;
    const newValue = !settings[key];
    setSaving(key);
    try {
      await setSetting(key, newValue, user.username);
      setSettings(prev => ({ ...prev, [key]: newValue }));
      setToast(`${newValue ? 'Enabled' : 'Disabled'} successfully`);
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setToast('Failed to save: ' + err.message);
    }
    setSaving(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>!</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Restricted</h3>
        <p style={{ color: '#6b7280' }}>Only the Super Admin can modify feature settings.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">Feature Settings</div>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
        Control which features are active for all staff. Only you (Super Admin) can change these settings.
      </p>

      {toast && <div className="toast">{toast}</div>}

      {FEATURES.map(f => {
        const enabled = settings[f.key] ?? f.default;
        return (
          <div key={f.key} className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 4 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                {f.description}
              </div>
            </div>
            <button
              onClick={() => toggleFeature(f.key)}
              disabled={saving === f.key}
              style={{
                width: 56, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer',
                background: enabled ? '#16a34a' : '#d1d5db',
                position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
              aria-label={`${f.label}: ${enabled ? 'enabled' : 'disabled'}`}
              aria-pressed={enabled}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: enabled ? 29 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        );
      })}

      <div style={{ marginTop: 16, padding: '12px 14px', background: '#f5f6f8', borderRadius: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
        Changes take effect immediately for all users. Feature toggles are stored in the database and persist across sessions.
      </div>
    </div>
  );
}
