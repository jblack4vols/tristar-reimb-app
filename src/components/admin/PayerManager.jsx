import { useState } from 'react';
import { useAdminData } from '../../utils/useAdminData';
import * as ds from '../../utils/adminDataStore';

export default function PayerManager({ user }) {
  const { payers, contractPayers } = useAdminData();

  // Fee schedule payer form state
  const [newPayer, setNewPayer] = useState('');
  const [renamingPayer, setRenamingPayer] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Contract payer form state
  const [newContractName, setNewContractName] = useState('');
  const [newContractRate, setNewContractRate] = useState('');
  const [editingContract, setEditingContract] = useState(null);
  const [editContractRate, setEditContractRate] = useState('');

  // ── Fee Schedule Payer actions ──────────────────────────

  const handleAddPayer = async () => {
    const name = newPayer.trim();
    if (!name) return;
    try {
      const added = await ds.addPayer(name);
      if (!added) {
        alert('A payer with that name already exists.');
        return;
      }
      setNewPayer('');
    } catch (err) {
      alert('Error adding payer: ' + err.message);
    }
  };

  const handleDeletePayer = async (name) => {
    if (!confirm(`Delete payer "${name}"? This will remove all associated rates and billing rules.`)) return;
    try {
      await ds.deletePayer(name);
    } catch (err) {
      alert('Error deleting payer: ' + err.message);
    }
  };

  const startRename = (name) => {
    setRenamingPayer(name);
    setRenameValue(name);
  };

  const handleRename = async (oldName) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenamingPayer(null);
      return;
    }
    try {
      await ds.renamePayer(oldName, newName);
      setRenamingPayer(null);
    } catch (err) {
      alert('Error renaming payer: ' + err.message);
    }
  };

  // ── Contract Payer actions ──────────────────────────────

  const handleAddContract = async () => {
    const name = newContractName.trim();
    const rate = parseFloat(newContractRate);
    if (!name) return;
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid per-visit rate.');
      return;
    }
    try {
      await ds.setContractPayer(name, rate);
      setNewContractName('');
      setNewContractRate('');
    } catch (err) {
      alert('Error adding contract payer: ' + err.message);
    }
  };

  const handleDeleteContract = async (name) => {
    if (!confirm(`Delete contract payer "${name}"?`)) return;
    try {
      await ds.deleteContractPayer(name);
    } catch (err) {
      alert('Error deleting contract payer: ' + err.message);
    }
  };

  const startEditContract = (name, rate) => {
    setEditingContract(name);
    setEditContractRate(String(rate));
  };

  const handleSaveContractRate = async (name) => {
    const rate = parseFloat(editContractRate);
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid per-visit rate.');
      return;
    }
    try {
      await ds.setContractPayer(name, rate);
      setEditingContract(null);
    } catch (err) {
      alert('Error updating contract rate: ' + err.message);
    }
  };

  // ── Render ──────────────────────────────────────────────

  const contractEntries = Object.entries(contractPayers).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div>
      {/* ── Fee Schedule Payers ─────────────────────── */}
      <div className="section-head">
        Fee Schedule Payers{' '}
        <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>({payers.length})</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field-label">Add Payer</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Payer name"
            value={newPayer}
            onChange={e => setNewPayer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPayer()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleAddPayer}>Add</button>
        </div>
      </div>

      {payers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          No fee schedule payers yet.
        </div>
      )}

      {payers.map(name => (
        <div key={name} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {renamingPayer === name ? (
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename(name);
                  if (e.key === 'Escape') setRenamingPayer(null);
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => handleRename(name)}>Save</button>
              <button className="btn btn-muted btn-sm" onClick={() => setRenamingPayer(null)}>Cancel</button>
            </div>
          ) : (
            <>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-muted btn-sm" onClick={() => startRename(name)}>Rename</button>
                {user?.role === 'superadmin' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeletePayer(name)}>Delete</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {/* ── Contract / Day Rate Payers ──────────────── */}
      <div className="section-head" style={{ marginTop: 32 }}>
        Contract / Day Rate Payers{' '}
        <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>({contractEntries.length})</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field-label">Add Contract Payer</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Payer name"
            value={newContractName}
            onChange={e => setNewContractName(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            placeholder="Per-visit rate"
            type="number"
            min="0"
            step="0.01"
            value={newContractRate}
            onChange={e => setNewContractRate(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddContract()}
            style={{ width: 120 }}
          />
          <button className="btn btn-primary" onClick={handleAddContract}>Add</button>
        </div>
      </div>

      {contractEntries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          No contract payers yet.
        </div>
      )}

      {contractEntries.map(([name, rate]) => (
        <div key={name} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>

          {editingContract === name ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editContractRate}
                onChange={e => setEditContractRate(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveContractRate(name);
                  if (e.key === 'Escape') setEditingContract(null);
                }}
                autoFocus
                style={{ width: 100 }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => handleSaveContractRate(name)}>Save</button>
              <button className="btn btn-muted btn-sm" onClick={() => setEditingContract(null)}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <span className="badge" style={{ fontWeight: 700, color: '#FF8200', cursor: 'pointer' }} onClick={() => startEditContract(name, rate)}>
                ${rate.toFixed(2)} / visit
              </span>
              <button className="btn btn-muted btn-sm" onClick={() => startEditContract(name, rate)}>Edit</button>
              {user?.role === 'superadmin' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContract(name)}>Delete</button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
