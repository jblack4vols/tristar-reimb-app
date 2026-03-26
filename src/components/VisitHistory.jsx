import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { decryptPHI } from '../utils/crypto';
import { useAdminData } from '../utils/useAdminData';

export default function VisitHistory({ user, adminView = false }) {
  const { codeLabels } = useAdminData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchEntries = async () => {
    setLoading(true);
    let query = supabase
      .from('billing_entries')
      .select('*')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    // Non-admin users only see their own entries
    if (!adminView) {
      query = query.eq('entered_by', user.username);
    }
    if (dateFrom) query = query.gte('visit_date', dateFrom);
    if (dateTo) query = query.lte('visit_date', dateTo);

    const { data, error } = await query;
    if (error) console.error('Visit history error:', error);
    // Decrypt PHI fields
    const decrypted = (data || []).map(e => ({
      ...e,
      patient_name: decryptPHI(e.patient_name),
      notes: decryptPHI(e.notes),
    }));
    setEntries(decrypted);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [dateFrom, dateTo]);

  const deleteEntry = async (id) => {
    if (!confirm('Delete this visit entry?')) return;
    await supabase.from('billing_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.patient_name.toLowerCase().includes(s) ||
      e.payer.toLowerCase().includes(s) ||
      e.provider.toLowerCase().includes(s) ||
      e.location.toLowerCase().includes(s) ||
      (e.entered_by || '').toLowerCase().includes(s) ||
      (e.codes || []).some(c => c.toLowerCase().includes(s))
    );
  });

  // Summary stats
  const totalRevenue = filtered.reduce((s, e) => s + Number(e.total || 0), 0);
  const uniquePatients = new Set(filtered.map(e => e.patient_name.toLowerCase())).size;

  return (
    <div>
      <div className="section-head">
        {adminView ? 'All Visit History' : 'My Visit History'}
        <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}> ({filtered.length} entries)</span>
      </div>

      {/* Summary cards */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="field-label">Total Visits</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FF8200' }}>{filtered.length}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="field-label">Unique Patients</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FF8200' }}>{uniquePatients}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="field-label">Total Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FF8200' }}>${totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <div>
          <label className="field-label">Search</label>
          <input
            placeholder="Patient, payer, provider, code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">From Date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label">To Date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {(dateFrom || dateTo || search) && (
        <button
          className="btn btn-muted btn-sm"
          style={{ marginBottom: 12 }}
          onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
        >
          Clear Filters
        </button>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading visits…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f3f4f6', borderRadius: 14, color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
          No visit entries found.<br/>
          Use the <strong>Calculator</strong> tab to log patient visits.
        </div>
      )}

      {/* Entry list */}
      <div style={{ maxHeight: 600, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {filtered.map(e => {
          const isExpanded = expandedId === e.id;
          return (
            <div key={e.id} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : e.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
                    {e.patient_name}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                    {new Date(e.visit_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    {e.payer && <span> · {e.payer}</span>}
                    {adminView && e.entered_by && <span> · by <strong>{e.entered_by}</strong></span>}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#FF8200', fontSize: 17, flexShrink: 0 }}>
                  ${Number(e.total || 0).toFixed(2)}
                </div>
              </div>

              {/* Code badges - always visible */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {(e.codes || []).map(code => (
                  <span key={code} className="badge" style={{ fontSize: 11 }}>{code}</span>
                ))}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
                  {e.provider && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      <strong>Provider:</strong> {e.provider}
                    </div>
                  )}
                  {e.location && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      <strong>Location:</strong> {e.location}
                    </div>
                  )}
                  {e.notes && (
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      <strong>Notes:</strong> {e.notes}
                    </div>
                  )}
                  {/* Code breakdown */}
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
                    {(e.codes || []).map(c => (
                      <div key={c} style={{ marginBottom: 2 }}>
                        <strong>{c}</strong> — {codeLabels[c] || ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button className="btn btn-danger btn-sm" onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
