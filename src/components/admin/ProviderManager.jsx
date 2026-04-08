import { useState } from 'react';
import { useAdminData } from '../../utils/useAdminData';
import * as ds from '../../utils/adminDataStore';

export default function ProviderManager() {
  const { providers } = useAdminData();

  const [search, setSearch] = useState('');

  // Add-provider form state (per location)
  const [addingAt, setAddingAt] = useState(null);     // location key currently adding to
  const [newName, setNewName] = useState('');
  const [newDiscipline, setNewDiscipline] = useState('PT');

  // Add-location form state
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');

  // Rename-location form state
  const [renamingLoc, setRenamingLoc] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  /* ---- helpers ---- */
  const locations = Object.keys(providers || {}).sort();

  const matchesSearch = (name) =>
    !search || name.toLowerCase().includes(search.toLowerCase());

  const filteredLocations = locations.filter(loc =>
    !search || loc.toLowerCase().includes(search.toLowerCase()) ||
    (providers[loc] || []).some(matchesSearch)
  );

  const getDiscipline = (name) => {
    if (name.includes('(COTA)')) return 'COTA';
    if (name.includes('(OT)'))   return 'OT';
    if (name.includes('(PTA)'))  return 'PTA';
    return 'PT';
  };

  const totalProviders = locations.reduce((n, loc) => n + (providers[loc]?.length || 0), 0);

  /* ---- actions ---- */
  const handleAddProvider = async (location) => {
    const trimmed = newName.trim();
    if (!trimmed) { alert('Provider name is required.'); return; }
    const fullName = newDiscipline !== 'PT' ? `${trimmed} (${newDiscipline})` : trimmed;
    const isOT = newDiscipline === 'OT' || newDiscipline === 'COTA';
    try {
      await ds.addProvider(location, fullName, isOT);
      setAddingAt(null);
      setNewName('');
      setNewDiscipline('PT');
    } catch (err) {
      alert(`Failed to add provider: ${err.message || err}`);
    }
  };

  const handleRemoveProvider = async (location, name) => {
    if (!confirm(`Remove "${name}" from ${location}?`)) return;
    try {
      await ds.removeProvider(location, name);
    } catch (err) {
      alert(`Failed to remove provider: ${err.message || err}`);
    }
  };

  const handleAddLocation = async () => {
    const trimmed = newLocName.trim();
    if (!trimmed) { alert('Location name is required.'); return; }
    try {
      await ds.addLocation(trimmed);
      setShowAddLoc(false);
      setNewLocName('');
    } catch (err) {
      alert(`Failed to add location: ${err.message || err}`);
    }
  };

  const handleRenameLocation = async (oldName) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === oldName) { setRenamingLoc(null); return; }
    try {
      await ds.renameLocation(oldName, trimmed);
      setRenamingLoc(null);
      setRenameValue('');
    } catch (err) {
      alert(`Failed to rename location: ${err.message || err}`);
    }
  };

  const handleRemoveLocation = async (name) => {
    const count = (providers[name] || []).length;
    if (!confirm(`Remove "${name}" and its ${count} provider${count === 1 ? '' : 's'}?`)) return;
    try {
      await ds.removeLocation(name);
    } catch (err) {
      alert(`Failed to remove location: ${err.message || err}`);
    }
  };

  /* ---- render ---- */
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-head">
          Providers{' '}
          <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
            ({totalProviders} across {locations.length} location{locations.length === 1 ? '' : 's'})
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowAddLoc(true); setNewLocName(''); }}>
          + Add Location
        </button>
      </div>

      {/* Add-location form */}
      {showAddLoc && (
        <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#FF8200', marginBottom: 14 }}>New Location</div>
          <div>
            <label className="field-label">Location Name *</label>
            <input
              value={newLocName}
              onChange={e => setNewLocName(e.target.value)}
              placeholder="e.g. Brentwood"
              autoComplete="off"
              onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleAddLocation}>Create Location</button>
            <button className="btn btn-muted" onClick={() => setShowAddLoc(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        placeholder="Search providers or locations\u2026"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {/* Empty state */}
      {filteredLocations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          {search
            ? 'No providers or locations match your search.'
            : <>No locations yet. Click <strong>+ Add Location</strong> to get started.</>}
        </div>
      )}

      {/* Location cards */}
      {filteredLocations.map(loc => {
        const names = (providers[loc] || []).filter(matchesSearch);

        return (
          <div key={loc} className="card" style={{ marginBottom: 16 }}>
            {/* Location header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              {renamingLoc === loc ? (
                <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 0 }}>
                  <input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRenameLocation(loc)}
                    autoFocus
                    style={{ flex: 1, minWidth: 100 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleRenameLocation(loc)}>Save</button>
                  <button className="btn btn-muted btn-sm" onClick={() => setRenamingLoc(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1f2937' }}>
                    {loc}{' '}
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>
                      ({(providers[loc] || []).length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setRenamingLoc(loc); setRenameValue(loc); }}
                    >
                      Rename
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveLocation(loc)}>
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Provider list */}
            {names.length === 0 && !search && (
              <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>No providers in this location.</div>
            )}

            {names.map(name => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 15 }}>{name}</span>
                  {(() => {
                    const d = getDiscipline(name);
                    const colors = { OT: { bg: '#dbeafe', color: '#1d4ed8' }, COTA: { bg: '#ede9fe', color: '#6d28d9' }, PTA: { bg: '#fce7f3', color: '#be185d' }, PT: { bg: '#dcfce7', color: '#15803d' } };
                    const c = colors[d] || colors.PT;
                    return <span className="badge" style={{ fontSize: 11, background: c.bg, color: c.color, border: 'none' }}>{d}</span>;
                  })()}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveProvider(loc, name)}>
                  Remove
                </button>
              </div>
            ))}

            {/* Add-provider form (inline) */}
            {addingAt === loc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Provider name"
                  autoComplete="off"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddProvider(loc)}
                  style={{ flex: 1, minWidth: 140 }}
                />
                <select
                  value={newDiscipline}
                  onChange={e => setNewDiscipline(e.target.value)}
                  style={{ width: 'auto', minWidth: 70, padding: '8px 10px', fontSize: 13 }}
                >
                  <option value="PT">PT</option>
                  <option value="PTA">PTA</option>
                  <option value="OT">OT</option>
                  <option value="COTA">COTA</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => handleAddProvider(loc)}>Add</button>
                <button className="btn btn-muted btn-sm" onClick={() => { setAddingAt(null); setNewName(''); setNewDiscipline('PT'); }}>Cancel</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => { setAddingAt(loc); setNewName(''); setNewDiscipline('PT'); }}
              >
                + Add Provider
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
