import { useState } from 'react';
import { store } from '../utils/store';

const ACTION_COLORS = {
  login:         '#1b5e20',
  login_fail:    '#b71c1c',
  logout:        '#6b7280',
  create_user:   '#FF8200',
  edit_user:     '#1565c0',
  delete_user:   '#b71c1c',
  deactivate:    '#e65100',
  activate:      '#1b5e20',
  delete_combo:  '#b71c1c',
  save_combo:    '#FF8200',
  forgot_password: '#7c3aed',
  import_rates:  '#1565c0',
};

export default function ActivityLog() {
  const [log, setLog] = useState(store.getLog);

  const clearLog = async () => {
    if (!confirm('Clear all activity logs? This cannot be undone.')) return;
    await store.clearLog();
    setLog([]);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-head">
          Activity Log <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>({log.length} entries)</span>
        </div>
        <button className="btn btn-danger btn-sm" onClick={clearLog}>Clear Log</button>
      </div>

      {log.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          No activity recorded yet.
        </div>
      )}

      <div style={{ maxHeight: 520, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {log.map((e, i) => (
          <div key={i} className="log-entry">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: ACTION_COLORS[e.action] || '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {(e.action || '').replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {e.ts ? new Date(e.ts).toLocaleString() : ''}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              by <strong style={{ color: '#1a1a1a' }}>{e.user}</strong>
              {e.detail ? ` — ${e.detail}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
