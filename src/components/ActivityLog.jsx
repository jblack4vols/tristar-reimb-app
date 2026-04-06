import React, { useState, useEffect } from 'react';
import { store } from '../utils/store';

function formatTs(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const ACTION_LABELS = {
  login: 'Sign In',
  logout: 'Sign Out',
  user_added: 'User Added',
  user_removed: 'User Removed',
  role_changed: 'Role Changed',
  combo_created: 'Combo Created',
  combo_deleted: 'Combo Deleted',
  calc: 'Calculation',
};

export default function ActivityLog() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(store.getLog());
  }, []);

  function handleClear() {
    if (!confirm('Clear all activity log entries?')) return;
    localStorage.removeItem('trc_log_v3');
    setEntries([]);
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Activity Log</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{entries.length} entries</span>
          {entries.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleClear} style={{ color: 'var(--red)' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">No activity recorded yet.</div>
        </div>
      ) : (
        <div>
          {entries.map((entry, i) => (
            <div key={i} className="log-entry">
              <div className="log-dot" />
              <div className="log-content">
                <div className="log-action">
                  {ACTION_LABELS[entry.action] || entry.action}
                </div>
                <div className="log-detail">{entry.detail}</div>
                <div className="log-ts">
                  {entry.user && <span>{entry.user} · </span>}
                  {formatTs(entry.ts)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
