import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { encryptPHI, decryptPHI } from '../utils/crypto';
import { useAdminData } from '../utils/useAdminData';

const BLANK_FORM = {
  name: '',
  payer: '',
  provider: '',
  location: '',
  diagnosis: '',
  notes: '',
};

export default function PatientDirectory({ user, onSelectPatient }) {
  const { payers, allProviders, loading: adminLoading } = useAdminData();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [editing, setEditing] = useState(null); // patient id when editing
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visitCounts, setVisitCounts] = useState({});   // { patientId: count }
  const [authStatus, setAuthStatus] = useState({});       // { patientId: { authorized, used, remaining } }

  // ── Fetch patients ──────────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Patient fetch error:', error);
      setPatients([]);
      setLoading(false);
      return;
    }

    const decrypted = (data || []).map(p => ({
      ...p,
      name: decryptPHI(p.name),
      notes: p.notes ? decryptPHI(p.notes) : '',
      _encryptedName: p.name, // keep original for billing match
    }));

    setPatients(decrypted);
    setLoading(false);

    // Fetch visit counts and auth status in parallel
    fetchVisitCounts(decrypted);
    fetchAuthStatuses(decrypted);
  }, []);

  // ── Visit counts (billing_entries per patient) ──────────────────────
  const fetchVisitCounts = async (patientList) => {
    const counts = {};
    // Batch: get all billing entries, then count client-side by encrypted name match
    const { data: entries } = await supabase
      .from('billing_entries')
      .select('patient_name');

    if (entries) {
      for (const p of patientList) {
        counts[p.id] = entries.filter(
          e => decryptPHI(e.patient_name).toLowerCase() === p.name.toLowerCase()
        ).length;
      }
    }
    setVisitCounts(counts);
  };

  // ── Authorization status per patient ────────────────────────────────
  const fetchAuthStatuses = async (patientList) => {
    const statuses = {};
    const ids = patientList.map(p => p.id);

    if (ids.length === 0) {
      setAuthStatus({});
      return;
    }

    const { data: auths, error } = await supabase
      .from('authorizations')
      .select('*')
      .in('patient_id', ids);

    if (error) {
      console.error('Auth fetch error:', error);
      setAuthStatus({});
      return;
    }

    for (const p of patientList) {
      const patientAuths = (auths || []).filter(a => a.patient_id === p.id);
      if (patientAuths.length === 0) {
        statuses[p.id] = null; // no authorization on file
      } else {
        // Sum authorized and used across all authorizations for this patient
        const totalAuthorized = patientAuths.reduce((s, a) => s + Number(a.authorized_visits || 0), 0);
        const totalUsed = patientAuths.reduce((s, a) => s + Number(a.used_visits || 0), 0);
        statuses[p.id] = {
          authorized: totalAuthorized,
          used: totalUsed,
          remaining: totalAuthorized - totalUsed,
        };
      }
    }
    setAuthStatus(statuses);
  };

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ── Form helpers ────────────────────────────────────────────────────
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(BLANK_FORM);
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (p) => {
    setForm({
      name: p.name,
      payer: p.payer || '',
      provider: p.provider || '',
      location: p.location || '',
      diagnosis: p.diagnosis || '',
      notes: p.notes || '',
    });
    setEditing(p.id);
    setShowForm(true);
  };

  // ── Save (add / update) ─────────────────────────────────────────────
  const save = async () => {
    if (!form.name.trim()) {
      alert('Patient name is required.');
      return;
    }
    setSaving(true);

    const payload = {
      name: encryptPHI(form.name.trim()),
      payer: form.payer,
      provider: form.provider,
      location: form.location,
      diagnosis: form.diagnosis,
      notes: form.notes.trim() ? encryptPHI(form.notes.trim()) : '',
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', editing);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('patients')
          .insert(payload);
        if (error) throw error;
      }
      resetForm();
      await fetchPatients();
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
    setSaving(false);
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const deletePatient = async (id) => {
    if (!confirm('Delete this patient permanently? This cannot be undone.')) return;
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) {
      alert('Delete failed: ' + error.message);
      return;
    }
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  // ── Filter ──────────────────────────────────────────────────────────
  const filtered = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.payer || '').toLowerCase().includes(s) ||
      (p.provider || '').toLowerCase().includes(s) ||
      (p.location || '').toLowerCase().includes(s) ||
      (p.diagnosis || '').toLowerCase().includes(s)
    );
  });

  // ── Auth badge renderer ─────────────────────────────────────────────
  const renderAuthBadge = (patientId) => {
    const auth = authStatus[patientId];
    if (!auth) {
      return <span className="badge badge-muted" style={{ fontSize: 11 }}>No Auth</span>;
    }
    const { remaining, authorized, used } = auth;
    let color, bg, label;
    if (remaining <= 0) {
      color = '#fff';
      bg = '#ef4444';
      label = `0 / ${authorized} remaining`;
    } else if (remaining <= 3) {
      color = '#92400e';
      bg = '#fde68a';
      label = `${remaining} / ${authorized} remaining`;
    } else {
      color = '#065f46';
      bg = '#a7f3d0';
      label = `${remaining} / ${authorized} remaining`;
    }
    return (
      <span
        className="badge"
        style={{ fontSize: 11, color, background: bg, border: 'none' }}
      >
        {label}
      </span>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-head">
          Patient Directory{' '}
          <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
            ({patients.length})
          </span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { resetForm(); setShowForm(true); }}
        >
          + Add Patient
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#FF8200', marginBottom: 14 }}>
            {editing ? 'Edit Patient' : 'New Patient'}
          </div>
          <div className="grid-2">
            <div>
              <label className="field-label">Patient Name *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Jane Doe"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="field-label">Payer</label>
              <select value={form.payer} onChange={e => set('payer', e.target.value)}>
                <option value="">-- Select Payer --</option>
                {(payers || []).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Provider</label>
              <select value={form.provider} onChange={e => set('provider', e.target.value)}>
                <option value="">-- Select Provider --</option>
                {(allProviders || []).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Location</label>
              <input
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Clinic location"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="field-label">Diagnosis</label>
              <input
                value={form.diagnosis}
                onChange={e => set('diagnosis', e.target.value)}
                placeholder="e.g. M54.5 Low Back Pain"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Internal notes (encrypted)"
                autoComplete="off"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving || adminLoading}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Patient'}
            </button>
            <button className="btn btn-muted" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search / filter */}
      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Search</label>
        <input
          placeholder="Filter by name, payer, provider, location, diagnosis..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {search && (
        <button
          className="btn btn-muted btn-sm"
          style={{ marginBottom: 12 }}
          onClick={() => setSearch('')}
        >
          Clear Filter
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          Loading patients...
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: '#f3f4f6',
          borderRadius: 14,
          color: '#6b7280',
          fontSize: 15,
          lineHeight: 1.6,
        }}>
          {patients.length === 0
            ? <>No patients yet. Click <strong>+ Add Patient</strong> to get started.</>
            : 'No patients match your search.'}
        </div>
      )}

      {/* Patient cards */}
      <div style={{ maxHeight: 640, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {filtered.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            {/* Top row: name + auth badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  {p.payer && <span>{p.payer}</span>}
                  {p.provider && <span>{p.payer ? ' · ' : ''}{p.provider}</span>}
                  {p.location && <span>{(p.payer || p.provider) ? ' · ' : ''}{p.location}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                {renderAuthBadge(p.id)}
              </div>
            </div>

            {/* Detail row: diagnosis + visit count */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {p.diagnosis && (
                <span className="badge" style={{ fontSize: 11 }}>{p.diagnosis}</span>
              )}
              <span className="badge badge-muted" style={{ fontSize: 11 }}>
                {visitCounts[p.id] !== undefined ? visitCounts[p.id] : '...'} visit{visitCounts[p.id] === 1 ? '' : 's'}
              </span>
            </div>

            {/* Notes (if present) */}
            {p.notes && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>
                {p.notes}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onSelectPatient && onSelectPatient(p.name)}
              >
                Select
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => startEdit(p)}
              >
                Edit
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => deletePatient(p.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
