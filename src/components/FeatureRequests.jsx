import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const STATUS_COLORS = {
  new: '#6b7280',
  reviewing: '#1565c0',
  planned: '#FF8200',
  'in progress': '#7c3aed',
  done: '#1b5e20',
  declined: '#b71c1c',
};

export default function FeatureRequests({ user, isAdmin = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchRequests = async () => {
    const { data } = await supabase.from('feature_requests').select('*').order('votes', { ascending: false }).order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const submit = async () => {
    if (!title.trim()) { alert('Please enter a title for your suggestion.'); return; }
    setSubmitting(true);
    await supabase.from('feature_requests').insert({
      title: title.trim(),
      description: description.trim(),
      submitted_by: user.name || user.username,
    });
    setTitle('');
    setDescription('');
    setSubmitting(false);
    setToast('Thanks for your suggestion!');
    setTimeout(() => setToast(''), 3000);
    fetchRequests();
  };

  const vote = async (id) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    await supabase.from('feature_requests').update({ votes: req.votes + 1 }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, votes: r.votes + 1 } : r));
  };

  const updateStatus = async (id, status) => {
    await supabase.from('feature_requests').update({ status }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteRequest = async (id) => {
    if (!confirm('Delete this request?')) return;
    await supabase.from('feature_requests').delete().eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      <div className="section-head">Feature Requests & Suggestions</div>

      {/* Submit form */}
      <div className="card" style={{ borderColor: '#FF8200', borderWidth: 2, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#FF8200', marginBottom: 12 }}>
          Suggest a Feature
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="field-label">What would you like to see? *</label>
          <input
            placeholder="e.g., Add a way to track denials"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label">Details (optional)</label>
          <textarea
            placeholder="Describe how this would help your workflow…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Suggestion'}
        </button>
      </div>

      {/* Requests list */}
      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading…</div>}

      {!loading && requests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f3f4f6', borderRadius: 14, color: '#6b7280', fontSize: 15 }}>
          No suggestions yet. Be the first!
        </div>
      )}

      {requests.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Vote button */}
            <div
              onClick={() => vote(r.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                padding: '6px 8px', borderRadius: 8, background: '#f3f4f6', minWidth: 44, flexShrink: 0,
                transition: 'background 0.1s',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>▲</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#FF8200' }}>{r.votes}</span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '2px 8px', borderRadius: 10, color: '#fff',
                  background: STATUS_COLORS[r.status] || '#6b7280',
                }}>
                  {r.status}
                </span>
              </div>
              {r.description && (
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 6 }}>
                  {r.description}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                by {r.submitted_by} · {new Date(r.created_at).toLocaleDateString()}
              </div>

              {/* Admin controls */}
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <select
                    value={r.status}
                    onChange={e => updateStatus(r.id, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', width: 'auto' }}
                  >
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="planned">Planned</option>
                    <option value="in progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="declined">Declined</option>
                  </select>
                  {user?.role === 'superadmin' && (
                    <button className="btn btn-danger btn-sm" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => deleteRequest(r.id)}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
