import React, { useState, useEffect } from 'react';
import { store } from '../utils/store';

export default function UserManager({ user }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');

  useEffect(() => {
    setUsers(store.getUsers());
  }, []);

  function handleAdd(e) {
    e.preventDefault();
    if (!email.trim()) return;

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      alert('A user with this email already exists.');
      return;
    }

    const newUser = {
      id: Date.now(),
      email: email.toLowerCase().trim(),
      name: name.trim() || email.split('@')[0],
      role,
      addedBy: user.email,
      addedAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    setUsers(updated);
    store.setUsers(updated);
    store.pushLog({ action: 'user_added', user: user.email, detail: `Added ${newUser.email} as ${role}` });
    setEmail('');
    setName('');
    setRole('user');
  }

  function handleRemove(id) {
    const target = users.find(u => u.id === id);
    if (!target) return;
    if (!confirm(`Remove ${target.email}?`)) return;

    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    store.setUsers(updated);
    store.pushLog({ action: 'user_removed', user: user.email, detail: `Removed ${target.email}` });
  }

  function handleToggleRole(id) {
    const updated = users.map(u => {
      if (u.id !== id) return u;
      const newRole = u.role === 'admin' ? 'user' : 'admin';
      store.pushLog({ action: 'role_changed', user: user.email, detail: `Changed ${u.email} to ${newRole}` });
      return { ...u, role: newRole };
    });
    setUsers(updated);
    store.setUsers(updated);
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Manage Users</h2>
        <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{users.length} users</span>
      </div>

      <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <div className="form-row form-row-3">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="user@tristarpt.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Optional"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="form-select"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary btn-sm" type="submit">Add</button>
            </div>
          </div>
        </div>
      </form>

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">No users added yet. Add team members above.</div>
        </div>
      ) : (
        <div>
          {users.map(u => (
            <div key={u.id} className="user-row">
              <div className="user-row-info">
                <span className="user-row-name">
                  {u.name} <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>{u.role}</span>
                </span>
                <span className="user-row-email">{u.email}</span>
              </div>
              <div className="user-row-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleToggleRole(u.id)}
                  title="Toggle role"
                >
                  {u.role === 'admin' ? '⬇ User' : '⬆ Admin'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleRemove(u.id)}
                  style={{ color: 'var(--red)' }}
                  title="Remove user"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
