import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { encryptPHI, decryptPHI } from '../utils/crypto';
import { useAdminData } from '../utils/useAdminData';

function todayISO() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function mondayISO() {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function lastMonthRange() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

const QUICK_RANGES = [
  { label: 'Today', from: todayISO, to: todayISO },
  { label: 'This Week', from: mondayISO, to: todayISO },
  { label: 'This Month', from: monthStart, to: todayISO },
  { label: 'Last Month', from: () => lastMonthRange().start, to: () => lastMonthRange().end },
  { label: 'Last 90 Days', from: () => daysAgo(90), to: todayISO },
  { label: 'All Time', from: () => '', to: () => '' },
];

export default function VisitHistory({ user, adminView = false }) {
  const { codeLabels } = useAdminData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(mondayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [filterPayer, setFilterPayer] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list | daily
  const [activeRange, setActiveRange] = useState('This Week');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchEntries = async () => {
    setLoading(true);
    let query = supabase
      .from('billing_entries')
      .select('*')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000);

    if (!adminView) {
      query = query.eq('entered_by', user.username);
    }
    if (dateFrom) query = query.gte('visit_date', dateFrom);
    if (dateTo) query = query.lte('visit_date', dateTo);

    const { data, error } = await query;
    if (error) console.error('Visit history error:', error);
    const decrypted = (data || []).map(e => ({
      ...e,
      patient_name: decryptPHI(e.patient_name),
      notes: e.notes ? decryptPHI(e.notes) : '',
    }));
    setEntries(decrypted);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [dateFrom, dateTo, adminView, user?.username]);

  const applyQuickRange = (range) => {
    setActiveRange(range.label);
    setDateFrom(range.from());
    setDateTo(range.to());
  };

  // Derived filter options from loaded data
  const payerOptions = useMemo(() => [...new Set(entries.map(e => e.payer).filter(Boolean))].sort(), [entries]);
  const providerOptions = useMemo(() => [...new Set(entries.map(e => e.provider).filter(Boolean))].sort(), [entries]);
  const locationOptions = useMemo(() => [...new Set(entries.map(e => e.location).filter(Boolean))].sort(), [entries]);

  // Apply all filters
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterPayer && e.payer !== filterPayer) return false;
      if (filterProvider && e.provider !== filterProvider) return false;
      if (filterLocation && e.location !== filterLocation) return false;
      if (search) {
        const s = search.toLowerCase();
        const match = (
          (e.patient_name || '').toLowerCase().includes(s) ||
          (e.payer || '').toLowerCase().includes(s) ||
          (e.provider || '').toLowerCase().includes(s) ||
          (e.location || '').toLowerCase().includes(s) ||
          (e.entered_by || '').toLowerCase().includes(s) ||
          (e.codes || []).some(c => c.toLowerCase().includes(s)) ||
          (e.notes || '').toLowerCase().includes(s) ||
          (e.visit_date || '').includes(s)
        );
        if (!match) return false;
      }
      return true;
    });
  }, [entries, search, filterPayer, filterProvider, filterLocation]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((s, e) => s + Number(e.total || 0), 0);
    const totalCodes = filtered.reduce((s, e) => s + (e.codes || []).length, 0);
    const uniquePatients = new Set(filtered.map(e => (e.patient_name || '').toLowerCase())).size;
    const avgPerVisit = filtered.length > 0 ? totalRevenue / filtered.length : 0;
    const avgCodes = filtered.length > 0 ? totalCodes / filtered.length : 0;
    return { totalRevenue, uniquePatients, avgPerVisit, avgCodes };
  }, [filtered]);

  // Daily grouped view
  const dailyGroups = useMemo(() => {
    if (viewMode !== 'daily') return [];
    const map = {};
    filtered.forEach(e => {
      const day = e.visit_date;
      if (!map[day]) map[day] = { date: day, entries: [], revenue: 0, codes: 0 };
      map[day].entries.push(e);
      map[day].revenue += Number(e.total || 0);
      map[day].codes += (e.codes || []).length;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered, viewMode]);

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({ patient_name: entry.patient_name, payer: entry.payer, provider: entry.provider, notes: entry.notes || '', visit_date: entry.visit_date });
  };

  const saveEdit = async (id) => {
    await supabase.from('billing_entries').update({
      patient_name: encryptPHI(editForm.patient_name),
      payer: editForm.payer,
      provider: editForm.provider,
      notes: editForm.notes.trim() ? encryptPHI(editForm.notes) : '',
      visit_date: editForm.visit_date,
    }).eq('id', id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...editForm } : e));
    setEditingId(null);
  };

  const deleteEntry = async (id) => {
    if (!confirm('Delete this visit entry?')) return;
    await supabase.from('billing_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const hasFilters = search || filterPayer || filterProvider || filterLocation;

  const renderEntry = (e) => {
    const isExpanded = expandedId === e.id;
    return (
      <div key={e.id} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : e.id)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{e.patient_name}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {new Date(e.visit_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {e.payer && <span> · {e.payer}</span>}
              {e.provider && <span> · {e.provider}</span>}
              {adminView && e.entered_by && <span> · by <strong>{e.entered_by}</strong></span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 700, color: '#FF8200', fontSize: 17 }}>${Number(e.total || 0).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{(e.codes || []).length} codes</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {(e.codes || []).map(code => (
            <span key={code} className="badge" style={{ fontSize: 11 }}>{code}</span>
          ))}
        </div>

        {isExpanded && (
          <div style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
            {e.location && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}><strong>Location:</strong> {e.location}</div>}
            {e.notes && <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}><strong>Notes:</strong> {e.notes}</div>}
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
              {(e.codes || []).map(c => (
                <div key={c} style={{ marginBottom: 2 }}><strong>{c}</strong> — {codeLabels[c] || ''}</div>
              ))}
            </div>
            {editingId === e.id ? (
              <div style={{ marginTop: 10, borderTop: '1.5px solid #FF8200', paddingTop: 10 }} onClick={ev => ev.stopPropagation()}>
                <div className="grid-2" style={{ marginBottom: 8 }}>
                  <div><label className="field-label">Patient Name</label><input value={editForm.patient_name} onChange={ev => setEditForm(f => ({ ...f, patient_name: ev.target.value }))} /></div>
                  <div><label className="field-label">Date</label><input type="date" value={editForm.visit_date} onChange={ev => setEditForm(f => ({ ...f, visit_date: ev.target.value }))} /></div>
                  <div><label className="field-label">Payer</label><input value={editForm.payer} onChange={ev => setEditForm(f => ({ ...f, payer: ev.target.value }))} /></div>
                  <div><label className="field-label">Provider</label><input value={editForm.provider} onChange={ev => setEditForm(f => ({ ...f, provider: ev.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 8 }}><label className="field-label">Notes</label><input value={editForm.notes} onChange={ev => setEditForm(f => ({ ...f, notes: ev.target.value }))} /></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={ev => { ev.stopPropagation(); saveEdit(e.id); }}>Save</button>
                  <button className="btn btn-muted btn-sm" onClick={ev => { ev.stopPropagation(); setEditingId(null); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-muted btn-sm" onClick={ev => { ev.stopPropagation(); startEdit(e); }}>Edit</button>
                {user?.role === 'superadmin' && (
                  <button className="btn btn-danger btn-sm" onClick={ev => { ev.stopPropagation(); deleteEntry(e.id); }}>Delete</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          {adminView ? 'All Visit History' : 'My Visit History'}
        </div>
        <div className="mode-toggle" style={{ marginBottom: 0, maxWidth: 220 }}>
          <button className={`mode-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}>List</button>
          <button className={`mode-btn${viewMode === 'daily' ? ' active' : ''}`} onClick={() => setViewMode('daily')}>By Day</button>
        </div>
      </div>

      {/* Quick date ranges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {QUICK_RANGES.map(r => (
          <button
            key={r.label}
            className={`group-pill${activeRange === r.label ? ' active' : ''}`}
            onClick={() => applyQuickRange(r)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid-2" style={{ marginBottom: 16, gap: 10 }}>
        <div className="revenue-card" style={{ padding: 16 }}>
          <div className="total-label">Total Revenue</div>
          <div className="total-amount" style={{ fontSize: 28 }}>${stats.totalRevenue.toFixed(2)}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{filtered.length} visits · {stats.uniquePatients} patients</div>
        </div>
        <div className="grid-2" style={{ gap: 10 }}>
          <div className="stat-card">
            <div className="stat-card-value" style={{ fontSize: 24 }}>${stats.avgPerVisit.toFixed(2)}</div>
            <div className="stat-card-label">Avg / Visit</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ fontSize: 24 }}>{stats.avgCodes.toFixed(1)}</div>
            <div className="stat-card-label">Avg Codes</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 200px', minWidth: 160 }}>
            <label className="field-label">Search</label>
            <input
              placeholder="Patient, payer, provider, code, notes, date..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 100 }}>
            <label className="field-label">From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActiveRange(''); }} />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 100 }}>
            <label className="field-label">To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActiveRange(''); }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {payerOptions.length > 1 && (
            <div style={{ flex: '1 1 140px' }}>
              <label className="field-label">Payer</label>
              <select value={filterPayer} onChange={e => setFilterPayer(e.target.value)}>
                <option value="">All Payers</option>
                {payerOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          {providerOptions.length > 1 && (
            <div style={{ flex: '1 1 140px' }}>
              <label className="field-label">Provider</label>
              <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
                <option value="">All Providers</option>
                {providerOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          {locationOptions.length > 1 && (
            <div style={{ flex: '1 1 140px' }}>
              <label className="field-label">Location</label>
              <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                <option value="">All Locations</option>
                {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          )}
        </div>
        {hasFilters && (
          <button
            className="btn btn-muted btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => { setSearch(''); setFilterPayer(''); setFilterProvider(''); setFilterLocation(''); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading visits...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f5f6f8', borderRadius: 14, color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
          No visit entries found for this period.{!adminView && <><br />Use <strong>New Visit</strong> or the <strong>Calculator</strong> to log visits.</>}
        </div>
      )}

      {/* Daily summary view */}
      {viewMode === 'daily' && !loading && dailyGroups.map(day => (
        <div key={day.date} style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', background: '#f5f6f8', borderRadius: '10px 10px 0 0',
            borderBottom: '2px solid #FF8200',
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 10 }}>
                {day.entries.length} visit{day.entries.length !== 1 ? 's' : ''} · {day.codes} codes
              </span>
            </div>
            <div style={{ fontWeight: 800, color: '#FF8200', fontSize: 18 }}>
              ${day.revenue.toFixed(2)}
            </div>
          </div>
          {day.entries.map(e => renderEntry(e))}
        </div>
      ))}

      {/* List view */}
      {viewMode === 'list' && !loading && (
        <div>
          {filtered.map(e => renderEntry(e))}
        </div>
      )}
    </div>
  );
}
