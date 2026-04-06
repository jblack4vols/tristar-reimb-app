import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAdminData } from '../utils/useAdminData';

const EMPTY_FORM = { name: '', diagnosis: '', description: '', codes: [] };

export default function TreatmentTemplates({ user, onApplyTemplate }) {
  const { rates, payers, codeLabels, codeGroups, loading: adminLoading } = useAdminData();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPayer, setSelectedPayer] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // ── Load templates ────────────────────────────────────
  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('treatment_templates')
      .select('*')
      .order('name');
    if (!error && data) setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  // ── Filtering ─────────────────────────────────────────
  const filtered = templates.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.diagnosis || '').toLowerCase().includes(q)
    );
  });

  // ── Reimbursement estimate ────────────────────────────
  const estimateTotal = (codes) => {
    if (!selectedPayer || !codes?.length) return null;
    return codes.reduce((sum, code) => sum + ((rates[code] || {})[selectedPayer] || 0), 0);
  };

  // ── Form helpers ──────────────────────────────────────
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setForm({
      name: t.name || '',
      diagnosis: t.diagnosis || '',
      description: t.description || '',
      codes: t.codes || [],
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const toggleCode = (code) => {
    setForm(prev => ({
      ...prev,
      codes: prev.codes.includes(code)
        ? prev.codes.filter(c => c !== code)
        : [...prev.codes, code],
    }));
  };

  // ── Save / Delete ─────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      diagnosis: form.diagnosis.trim(),
      description: form.description.trim(),
      codes: form.codes,
      updated_by: user?.username || 'unknown',
    };

    if (editingId) {
      await supabase.from('treatment_templates').update(payload).eq('id', editingId);
    } else {
      payload.created_by = user?.username || 'unknown';
      await supabase.from('treatment_templates').insert(payload);
    }
    setSaving(false);
    resetForm();
    fetchTemplates();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('treatment_templates').delete().eq('id', id);
    fetchTemplates();
  };

  // ── Resolve groups: prefer Supabase-backed codeGroups, fall back to all known codes ──
  const groups = codeGroups.length > 0
    ? codeGroups
    : [{ key: 'all', label: 'All Codes', codes: Object.keys(codeLabels) }];

  // ── Render ────────────────────────────────────────────
  if (adminLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
        Loading templates...
      </div>
    );
  }

  return (
    <div>
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span>Treatment Templates <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>({templates.length})</span></span>
        {isAdmin && !showForm && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Template</button>
        )}
      </div>

      {/* ── Controls row ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or diagnosis..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select
          value={selectedPayer}
          onChange={e => setSelectedPayer(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Payer (for estimates)</option>
          {payers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* ── Create / Edit form ───────────────────────────── */}
      {showForm && isAdmin && (
        <div className="card" style={{ borderLeft: '4px solid #FF8200', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            {editingId ? 'Edit Template' : 'New Template'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <label className="field-label">Template Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Standard Knee Rehab"
              />
            </div>
            <div className="grid-2">
              <div>
                <label className="field-label">Diagnosis</label>
                <input
                  value={form.diagnosis}
                  onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  placeholder="e.g. Post-op ACL Reconstruction"
                />
              </div>
              <div>
                <label className="field-label">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                />
              </div>
            </div>
          </div>

          {/* Code multi-select grouped */}
          <label className="field-label">Codes ({form.codes.length} selected)</label>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 14, background: '#fafafa' }}>
            {groups.map(g => {
              const groupCodes = g.codes || [];
              if (groupCodes.length === 0) return null;
              return (
                <div key={g.key} style={{ marginBottom: 10 }}>
                  <div className="group-pill" style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>
                    {g.label}
                  </div>
                  <div className="group-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {groupCodes.map(code => {
                      const active = form.codes.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`code-btn ${active ? 'active' : ''}`}
                          onClick={() => toggleCode(code)}
                          style={{
                            background: active ? '#FF8200' : '#f3f4f6',
                            color: active ? '#fff' : '#374151',
                            border: active ? '2px solid #FF8200' : '2px solid #e5e7eb',
                            borderRadius: 8,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all .15s',
                          }}
                          title={codeLabels[code] || code}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim() || form.codes.length === 0}
            >
              {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
            </button>
            <button className="btn btn-muted" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Template cards ───────────────────────────────── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f3f4f6', borderRadius: 14, color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
          {search ? 'No templates match your search.' : 'No treatment templates yet.'}
          {isAdmin && !search && <><br />Tap <strong>+ New Template</strong> above to create one.</>}
        </div>
      )}

      {filtered.map(t => {
        const est = estimateTotal(t.codes);
        return (
          <div key={t.id} className="card" style={{ marginBottom: 12 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                {t.diagnosis && (
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    <strong>Dx:</strong> {t.diagnosis}
                  </div>
                )}
              </div>
              {est !== null && (
                <div style={{ fontWeight: 700, color: '#FF8200', fontSize: 16, flexShrink: 0 }}>
                  ${est.toFixed(2)}
                </div>
              )}
            </div>

            {/* Description */}
            {t.description && (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>
                {t.description}
              </div>
            )}

            {/* Code badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {(t.codes || []).map(code => (
                <span
                  key={code}
                  className="badge"
                  style={{ fontSize: 11 }}
                  title={codeLabels[code] || code}
                >
                  {code}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onApplyTemplate(t.codes)}
              >
                Apply
              </button>
              {isAdmin && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                  {user?.role === 'superadmin' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                  )}
                </>
              )}
              {t.created_by && (
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
                  by {t.created_by}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
