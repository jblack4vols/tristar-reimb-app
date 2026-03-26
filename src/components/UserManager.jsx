import { useState } from 'react';
import bcrypt from 'bcryptjs';
import { store } from '../utils/store';
import { supabase } from '../utils/supabase';
import { useAdminData } from '../utils/useAdminData';

const BLANK = { id:'', name:'', username:'', password:'', email:'', location:'', role:'staff', active:true };

export default function UserManager() {
  const { providers: PROVIDERS_MAP, allProviders } = useAdminData();
  const [users, setUsers]     = useState(() => store.getUsers());
  const [form, setForm]       = useState(BLANK);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      alert('Name, username, and password are required.');
      return;
    }
    setSaving(true);
    try {
      // Hash password if it's not already hashed
      const hashedPassword = form.password.startsWith('$2')
        ? form.password
        : bcrypt.hashSync(form.password, 10);
      const formWithHash = { ...form, password: hashedPassword };
      let updated;
      if (editing) {
        updated = users.map(u => u.id === formWithHash.id ? { ...formWithHash } : u);
        await store.pushLog({ user: 'jordan', action: 'edit_user', detail: `Edited ${formWithHash.username}` });
      } else {
        if (users.find(u => u.username.toLowerCase() === form.username.toLowerCase())) {
          alert('Username already exists.'); setSaving(false); return;
        }
        const nu = { ...formWithHash, id: `u_${Date.now()}` };
        updated = [...users, nu];
        await store.pushLog({ user: 'jordan', action: 'create_user', detail: `Created ${formWithHash.username}` });
        // Queue welcome email if user has an email
        if (form.email) {
          await supabase.from('email_queue').insert({
            to_email: form.email,
            to_name: form.name,
            subject: 'Welcome to Tristar PT Reimbursement Calculator',
            body: `Hi ${form.name},\n\nYour account has been created.\n\nUsername: ${form.username}\nPassword: ${form.password}\nLocation: ${form.location || 'Not assigned'}\n\nSign in at: https://rcalc.tristarpt.com/\n\nIf you have a Tristar Microsoft 365 account, you can also use "Sign in with Microsoft 365".\n\n— Tristar Physical Therapy`,
          }).then(({ error }) => { if (error) console.error('Email queue error:', error); });
        }
      }
      await store.setUsers(updated);
      setUsers(updated);
      reset();
    } catch (e) { alert('Save failed: ' + e.message); }
    setSaving(false);
  };

  const edit = u => { setForm({ ...u }); setEditing(true); setShowForm(true); };

  const del = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    const u = users.find(x => x.id === id);
    const up = users.filter(x => x.id !== id);
    await store.setUsers(up);
    await store.pushLog({ user: 'jordan', action: 'delete_user', detail: u?.username });
    setUsers(up);
  };

  const toggleActive = async (u) => {
    const up = users.map(x => x.id === u.id ? { ...x, active: !x.active } : x);
    await store.setUsers(up);
    await store.pushLog({ user: 'jordan', action: u.active ? 'deactivate' : 'activate', detail: u.username });
    setUsers(up);
  };

  const reset = () => { setForm(BLANK); setEditing(false); setShowForm(false); };

  const bulkCreateFromProviders = async () => {
    const existingUsernames = users.map(u => u.username.toLowerCase());
    const newUsers = [];
    for (const prov of (allProviders || [])) {
      // Generate email-style username: firstname.lastname@tristarpt.com
      const parts = prov.name.replace(/\s*\(OT\)\s*/i, '').replace(/\s*\(COTA\)\s*/i, '').replace(/\s*\(PTA\)\s*/i, '').trim().split(/\s+/);
      const first = (parts[0] || '').toLowerCase();
      const last = (parts[parts.length - 1] || '').toLowerCase();
      const email = `${first}.${last}@tristarpt.com`;
      if (existingUsernames.includes(email)) continue; // skip existing
      newUsers.push({
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: prov.name,
        username: email,
        password: 'Tristar2026',
        email,
        location: prov.location || '',
        role: 'staff',
        active: true,
      });
    }
    if (newUsers.length === 0) { alert('All providers already have accounts.'); return; }
    if (!confirm(`Create ${newUsers.length} new user account(s) from providers?\n\nUsername: email (e.g., julia.bentley@tristarpt.com)\nPassword: Tristar2026`)) return;
    setBulkLoading(true);
    try {
      const updated = [...users, ...newUsers];
      await store.setUsers(updated);
      await store.pushLog({ user: 'jordan', action: 'bulk_create_users', detail: `Created ${newUsers.length} accounts from providers` });
      setUsers(updated);
      alert(`${newUsers.length} accounts created successfully!`);
    } catch (e) { alert('Failed: ' + e.message); }
    setBulkLoading(false);
  };

  const filtered = users.filter(u =>
    !search || [u.name, u.username, u.location || ''].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="section-head">
          Users <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>({users.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { reset(); setShowForm(true); }}>+ Add User</button>
          <button className="btn btn-ghost btn-sm" onClick={bulkCreateFromProviders} disabled={bulkLoading}>
            {bulkLoading ? 'Creating…' : 'Create from Providers'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#FF8200', marginBottom: 14 }}>
            {editing ? 'Edit User' : 'New User'}
          </div>
          <div className="grid-2">
            <div>
              <label className="field-label">Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" autoComplete="off"/>
            </div>
            <div>
              <label className="field-label">Username *</label>
              <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="jsmith" autoCapitalize="none" autoComplete="off"/>
            </div>
            <div>
              <label className="field-label">Password *</label>
              <input type="text" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Set a password" autoComplete="off"/>
            </div>
            <div>
              <label className="field-label">Email (for MS SSO matching)</label>
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jsmith@tristarpt.com" autoCapitalize="none"/>
            </div>
            <div>
              <label className="field-label">Location</label>
              <select value={form.location} onChange={e => set('location', e.target.value)}>
                <option value="">— Select —</option>
                {Object.keys(PROVIDERS_MAP).map(l => <option key={l}>{l}</option>)}
                <option value="Admin">Admin / All Locations</option>
              </select>
            </div>
            <div>
              <label className="field-label">Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 }}>
            <input type="checkbox" id="activeChk" checked={form.active} onChange={e => set('active', e.target.checked)}
              style={{ width: 20, height: 20, accentColor: '#FF8200', cursor: 'pointer' }}/>
            <label htmlFor="activeChk" style={{ fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Account active</label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
            </button>
            <button className="btn btn-muted" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      <input
        placeholder="Search by name, username, or location…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: 15 }}>
          No users yet. Click <strong>+ Add User</strong> to get started.
        </div>
      )}

      {filtered.map(u => (
        <div key={u.id} className={`user-card${u.active ? '' : ' inactive'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{u.name}</div>
              <div className="user-meta">
                @{u.username}{u.email ? ` · ${u.email}` : ''}{u.location ? ` · ${u.location}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge" style={{ fontSize: 11 }}>{u.role}</span>
                {u.msAccount && <span className="badge-muted badge" style={{ fontSize: 11 }}>Microsoft SSO</span>}
                {!u.active && <span className="badge-danger badge" style={{ fontSize: 11 }}>Inactive</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-muted" onClick={() => edit(u)}>Edit</button>
            <button className={`btn btn-sm ${u.active ? 'btn-muted' : 'btn-primary'}`} onClick={() => toggleActive(u)}>
              {u.active ? 'Deactivate' : 'Activate'}
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => del(u.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
