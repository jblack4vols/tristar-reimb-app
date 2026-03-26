import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { encryptPHI, decryptPHI } from '../utils/crypto';

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  patient_id: '',
  payer: '',
  approved_visits: '',
  used_visits: 0,
  start_date: '',
  end_date: '',
  auth_number: '',
  notes: '',
};

function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const diff = new Date(dateStr + 'T23:59:59') - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deriveStatus(auth) {
  if (auth.used_visits >= auth.approved_visits) return 'completed';
  if (auth.end_date < TODAY) return 'expired';
  return 'active';
}

function progressColor(used, approved) {
  if (!approved) return '#d1d5db';
  const remaining = (approved - used) / approved;
  if (remaining < 0.10) return '#ef4444';
  if (remaining < 0.30) return '#f59e0b';
  return '#22c55e';
}

function statusBadgeClass(status) {
  if (status === 'expired' || status === 'completed') return 'badge badge-danger';
  return 'badge';
}

export default function AuthTracker({ user }) {
  const [auths, setAuths] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* ── Fetch patients for dropdown ── */
  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('id, patient_name')
      .order('patient_name');
    if (error) { console.error('Patients fetch error:', error); return; }
    const decrypted = (data || []).map(p => ({
      ...p,
      patient_name: decryptPHI(p.patient_name),
    }));
    setPatients(decrypted);
  };

  /* ── Fetch authorizations ── */
  const fetchAuths = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('authorizations')
      .select('*, patients(patient_name)')
      .order('end_date', { ascending: true });
    if (error) { console.error('Auth fetch error:', error); setLoading(false); return; }

    const rows = (data || []).map(a => {
      const rawName = a.patients?.patient_name || '';
      const status = deriveStatus(a);
      return { ...a, _patientName: decryptPHI(rawName), _status: status };
    });

    // Auto-update status in DB for expired / completed rows that haven't been marked yet
    for (const r of rows) {
      if (r._status !== (r.status || 'active')) {
        supabase.from('authorizations').update({ status: r._status }).eq('id', r.id).then();
      }
    }

    setAuths(rows);
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); fetchAuths(); }, []);

  /* ── Alerts: expiring soon or low visits ── */
  const alerts = useMemo(() => {
    return auths.filter(a => {
      if (a._status !== 'active') return false;
      const remaining = a.approved_visits - a.used_visits;
      const days = daysUntil(a.end_date);
      return days <= 7 || remaining <= 3;
    });
  }, [auths]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return auths.filter(a => {
      if (statusFilter !== 'all' && a._status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          a._patientName.toLowerCase().includes(s) ||
          (a.payer || '').toLowerCase().includes(s) ||
          (a.auth_number || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [auths, statusFilter, search]);

  /* ── Form helpers ── */
  const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.patient_id || !form.approved_visits || !form.start_date || !form.end_date) return;
    setSaving(true);
    const payload = {
      patient_id: form.patient_id,
      payer: form.payer,
      approved_visits: Number(form.approved_visits),
      used_visits: Number(form.used_visits) || 0,
      start_date: form.start_date,
      end_date: form.end_date,
      auth_number: form.auth_number,
      notes: form.notes,
      status: 'active',
      created_by: user.username,
    };
    const { error } = await supabase.from('authorizations').insert([payload]);
    if (error) { console.error('Insert auth error:', error); setSaving(false); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    fetchAuths();
  };

  const incrementVisit = async (auth) => {
    const newUsed = auth.used_visits + 1;
    const newStatus = newUsed >= auth.approved_visits ? 'completed' : auth._status;
    await supabase.from('authorizations').update({ used_visits: newUsed, status: newStatus }).eq('id', auth.id);
    fetchAuths();
  };

  /* ── Format date for display ── */
  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Visit Authorizations</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Authorization'}
        </button>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {alerts.map(a => {
            const remaining = a.approved_visits - a.used_visits;
            const days = daysUntil(a.end_date);
            const isLowVisits = remaining <= 3;
            const isExpiring = days <= 7;
            return (
              <div
                key={a.id}
                className={isLowVisits && remaining <= 1 ? 'alert-danger' : 'alert-warning'}
                style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 6, fontSize: 13, lineHeight: 1.5 }}
              >
                <strong>{a._patientName}</strong>
                {isLowVisits && <span> — Only <strong>{remaining}</strong> visit{remaining !== 1 ? 's' : ''} remaining</span>}
                {isExpiring && <span> — Auth expires in <strong>{days}</strong> day{days !== 1 ? 's' : ''}</span>}
                {a.auth_number && <span style={{ color: '#6b7280' }}> (Auth #{a.auth_number})</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Authorization Form ── */}
      {showForm && (
        <div className="card card-surface" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>New Authorization</div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div>
              <label className="field-label">Patient</label>
              <select value={form.patient_id} onChange={e => updateField('patient_id', e.target.value)}>
                <option value="">Select patient…</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.patient_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Payer</label>
              <input value={form.payer} onChange={e => updateField('payer', e.target.value)} placeholder="e.g. Aetna, BCBS" />
            </div>
            <div>
              <label className="field-label">Auth Number</label>
              <input value={form.auth_number} onChange={e => updateField('auth_number', e.target.value)} placeholder="Authorization #" />
            </div>
            <div>
              <label className="field-label">Approved Visits</label>
              <input type="number" min="1" value={form.approved_visits} onChange={e => updateField('approved_visits', e.target.value)} placeholder="e.g. 12" />
            </div>
            <div>
              <label className="field-label">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} />
            </div>
            <div>
              <label className="field-label">End Date</label>
              <input type="date" value={form.end_date} onChange={e => updateField('end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Notes</label>
            <input value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Optional notes" />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Authorization'}
            </button>
            <button className="btn btn-muted" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="grid-2" style={{ marginBottom: 12, gap: 12 }}>
        <div>
          <label className="field-label">Search</label>
          <input placeholder="Patient name, payer, auth #…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {(search || statusFilter !== 'active') && (
        <button
          className="btn btn-muted btn-sm"
          style={{ marginBottom: 12 }}
          onClick={() => { setSearch(''); setStatusFilter('active'); }}
        >
          Clear Filters
        </button>
      )}

      {/* ── Loading / Empty ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading authorizations…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f3f4f6', borderRadius: 14, color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
          No authorizations found.<br />
          Tap <strong>+ Add Authorization</strong> to create one.
        </div>
      )}

      {/* ── Auth Cards ── */}
      <div style={{ maxHeight: 640, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {filtered.map(a => {
          const remaining = a.approved_visits - a.used_visits;
          const pct = a.approved_visits ? Math.min((a.used_visits / a.approved_visits) * 100, 100) : 0;
          const barColor = progressColor(a.used_visits, a.approved_visits);

          return (
            <div key={a.id} className="card" style={{ marginBottom: 10 }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{a._patientName}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {a.payer && <span>{a.payer}</span>}
                    {a.auth_number && <span> · Auth #{a.auth_number}</span>}
                  </div>
                </div>
                <span className={statusBadgeClass(a._status)} style={a._status === 'active' ? { background: '#dcfce7', color: '#16a34a' } : {}}>
                  {a._status}
                </span>
              </div>

              {/* Remaining visits – large number */}
              <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: barColor, lineHeight: 1 }}>{remaining}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>visits remaining</div>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#e5e7eb', borderRadius: 8, height: 10, overflow: 'hidden', margin: '8px 0' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 8,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                <span>{a.used_visits} used</span>
                <span>{a.approved_visits} approved</span>
              </div>

              {/* Date range */}
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                {fmtDate(a.start_date)} — {fmtDate(a.end_date)}
              </div>

              {/* Notes */}
              {a.notes && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>{a.notes}</div>
              )}

              {/* Actions */}
              {a._status === 'active' && (
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: '#FF8200', borderColor: '#FF8200' }}
                    onClick={() => incrementVisit(a)}
                  >
                    + Log Visit ({a.used_visits + 1} / {a.approved_visits})
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
