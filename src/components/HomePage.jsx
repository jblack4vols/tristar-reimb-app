import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

/* ── Quick-action card definitions ── */
const ACTIONS = [
  {
    key: 'newvisit',
    icon: '\uD83D\uDCDD',
    label: 'New Visit',
    desc: 'Log a new patient visit',
    primary: true,
  },
  {
    key: 'patients',
    icon: '\uD83D\uDD0D',
    label: 'Look Up Patient',
    desc: 'Search patient directory',
  },
  {
    key: 'calc',
    icon: '\uD83E\uDDEE',
    label: 'Calculator',
    desc: 'Reimbursement calculator',
  },
  {
    key: 'templates',
    icon: '\uD83D\uDCCB',
    label: 'Templates',
    desc: 'Treatment code templates',
  },
];

/* ── Date helpers ── */
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function mondayISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}

export default function HomePage({ user, onNavigate, recentPatients = [] }) {
  const [visitsToday, setVisitsToday] = useState(null);
  const [visitsWeek, setVisitsWeek] = useState(null);

  /* ── Fetch quick stats on mount ── */
  useEffect(() => {
    if (!user?.username) return;

    const fetchStats = async () => {
      const today = todayISO();
      const monday = mondayISO();

      const [todayRes, weekRes] = await Promise.all([
        supabase
          .from('billing_entries')
          .select('id', { count: 'exact', head: true })
          .eq('entered_by', user.username)
          .eq('visit_date', today),
        supabase
          .from('billing_entries')
          .select('id', { count: 'exact', head: true })
          .eq('entered_by', user.username)
          .gte('visit_date', monday)
          .lte('visit_date', today),
      ]);

      setVisitsToday(todayRes.count ?? 0);
      setVisitsWeek(weekRes.count ?? 0);
    };

    fetchStats();
  }, [user?.username]);

  return (
    <div style={{ padding: '8px 0' }}>

      {/* ── Welcome with Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img
          src="https://assets.cdn.filesafe.space/4OhLjdxKCuBxvgs4TpUU/media/6630c406f4d5b72faba066f0.jpeg"
          alt="Tristar Physical Therapy"
          style={{ width: 72, height: 72, objectFit: 'contain' }}
          onError={e => { e.target.style.opacity = '0'; }}
        />
        <div>
          <h2 className="section-head" style={{ marginBottom: 4 }}>
            Welcome back, {user?.name || 'Therapist'}
          </h2>
          {user?.location && <span className="badge">{user.location}</span>}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <p className="field-label">Quick Actions</p>
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {ACTIONS.map((a) => (
          <div
            key={a.key}
            className="card"
            onClick={() => onNavigate(a.key)}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              padding: '22px 12px',
              transition: 'transform 0.12s, box-shadow 0.12s',
              ...(a.primary
                ? { background: '#FF8200', color: '#fff', border: '1.5px solid #FF8200' }
                : {}),
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{a.label}</div>
            <div
              style={{
                fontSize: 12,
                color: a.primary ? 'rgba(255,255,255,0.8)' : '#6b7280',
                marginTop: 2,
              }}
            >
              {a.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Patients ── */}
      {recentPatients.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="field-label">Recent Patients</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recentPatients.map((name) => (
              <span
                key={name}
                className="chip"
                onClick={() => onNavigate('newvisit')}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Stats ── */}
      <p className="field-label">Quick Stats</p>
      <div className="grid-2">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FF8200' }}>
            {visitsToday === null ? '\u2013' : visitsToday}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Visits Today
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FF8200' }}>
            {visitsWeek === null ? '\u2013' : visitsWeek}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Visits This Week
          </div>
        </div>
      </div>
    </div>
  );
}
