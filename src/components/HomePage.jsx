import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';

/* ── Quick-action card definitions ── */
const ACTIONS = [
  {
    key: 'newvisit',
    icon: '+',
    label: 'Log New Visit',
    desc: 'Start logging a patient visit now',
    primary: true,
  },
  {
    key: 'calc',
    icon: '$',
    label: 'Rate Calculator',
    desc: 'Compare payer rates & optimize codes',
  },
  {
    key: 'patients',
    icon: '\u{1F50D}',
    label: 'Patient Lookup',
    desc: 'Search patient directory',
  },
  {
    key: 'batch',
    icon: '\u{1F4CB}',
    label: 'Batch Entry',
    desc: 'Log multiple visits at once',
  },
];

const BILLING_TIPS = [
  'Always check if a higher-unit timed code is supported by your treatment time. Billing 2TX instead of TX can significantly increase reimbursement.',
  'Use the 8-Minute Rule calculator to make sure you\'re billing the maximum units your treatment time supports.',
  'For Medicare patients, always use G0283 (ESM) instead of 97014 (ES) for electrical stimulation.',
  'Remember: Aetna does not allow Therapeutic Activity (TA) and Manual Therapy (MT) on the same claim.',
  'Check payer-specific billing rules before submitting. Different payers have different code restrictions.',
  'Document thoroughly to support higher complexity evaluations (EVAL-62 or EVAL-63 vs EVAL-61). Better documentation = higher reimbursement.',
  'Review your saved combos periodically. Make sure they reflect the most reimbursement-friendly code combinations for each payer.',
  'Use treatment templates for common diagnoses to ensure you never miss billable codes.',
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function mondayISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

export default function HomePage({ user, onNavigate, recentPatients = [] }) {
  const [visitsToday, setVisitsToday] = useState(null);
  const [visitsWeek, setVisitsWeek] = useState(null);
  const [revenueToday, setRevenueToday] = useState(null);
  const [revenueWeek, setRevenueWeek] = useState(null);

  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return BILLING_TIPS[dayOfYear % BILLING_TIPS.length];
  }, []);

  useEffect(() => {
    if (!user?.username) return;

    const fetchStats = async () => {
      const today = todayISO();
      const monday = mondayISO();

      const [todayRes, weekRes] = await Promise.all([
        supabase
          .from('billing_entries')
          .select('id, total')
          .eq('entered_by', user.username)
          .eq('visit_date', today),
        supabase
          .from('billing_entries')
          .select('id, total')
          .eq('entered_by', user.username)
          .gte('visit_date', monday)
          .lte('visit_date', today),
      ]);

      const todayData = todayRes.data || [];
      const weekData = weekRes.data || [];

      setVisitsToday(todayData.length);
      setVisitsWeek(weekData.length);
      setRevenueToday(todayData.reduce((s, r) => s + (r.total || 0), 0));
      setRevenueWeek(weekData.reduce((s, r) => s + (r.total || 0), 0));
    };

    fetchStats();
  }, [user?.username]);

  return (
    <div style={{ padding: '8px 0' }}>

      {/* ── Welcome ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <img
          src="https://assets.cdn.filesafe.space/4OhLjdxKCuBxvgs4TpUU/media/6630c406f4d5b72faba066f0.jpeg"
          alt="Tristar Physical Therapy"
          style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          onError={e => { e.target.style.opacity = '0'; }}
        />
        <div>
          <h2 className="section-head" style={{ marginBottom: 4 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Therapist'}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {user?.location && <span className="badge">{user.location}</span>}
            <span className="badge badge-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* ── Revenue Summary ── */}
      <div className="revenue-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="total-label">Today's Expected Revenue</div>
            <div className="total-amount">
              {revenueToday === null ? '\u2013' : `$${revenueToday.toFixed(2)}`}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              {visitsToday === null ? '' : `${visitsToday} visit${visitsToday !== 1 ? 's' : ''} logged`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="total-label">This Week</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {revenueWeek === null ? '\u2013' : `$${revenueWeek.toFixed(2)}`}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              {visitsWeek === null ? '' : `${visitsWeek} visit${visitsWeek !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="field-label" style={{ marginBottom: 8 }}>Quick Actions</div>
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {ACTIONS.map((a) => (
          <div
            key={a.key}
            className={`card action-card${a.primary ? ' action-card-primary' : ''}`}
            onClick={() => onNavigate(a.key)}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: a.primary ? 'rgba(255,255,255,0.2)' : 'rgba(255,130,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: a.primary ? 24 : 20, fontWeight: 800,
              color: a.primary ? '#fff' : '#FF8200',
              margin: '0 auto 10px',
            }}>
              {a.icon}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{a.label}</div>
            <div style={{
              fontSize: 12,
              color: a.primary ? 'rgba(255,255,255,0.8)' : '#6b7280',
              marginTop: 3, lineHeight: 1.4,
            }}>
              {a.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Billing Tip of the Day ── */}
      <div className="optimization-tip" style={{ marginBottom: 24 }}>
        <span className="optimization-tip-icon">$</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, color: '#16a34a' }}>
            Billing Tip of the Day
          </div>
          <div>{dailyTip}</div>
        </div>
      </div>

      {/* ── Recent Patients ── */}
      {recentPatients.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Recent Patients</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recentPatients.map((name) => (
              <span
                key={name}
                className="chip"
                onClick={() => onNavigate('newvisit')}
                style={{ transition: 'transform 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
