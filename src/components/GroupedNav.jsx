import { useState, useRef, useEffect } from 'react';

const NAV_GROUPS = [
  {
    label: 'Home',
    icon: '🏠',
    tabs: [{ k: 'home', label: 'Home' }],
  },
  {
    label: 'Clinical',
    icon: '🩺',
    tabs: [
      { k: 'calc',      label: 'Calculator' },
      { k: 'newvisit',  label: 'New Visit' },
      { k: 'patients',  label: 'Patients' },
      { k: 'auths',     label: 'Authorizations' },
      { k: 'templates', label: 'Templates' },
    ],
  },
  {
    label: 'History',
    icon: '📋',
    tabs: [
      { k: 'visits',  label: 'Visit History' },
      { k: 'combos',  label: 'Saved Combos' },
    ],
  },
  {
    label: 'Rates & Payers',
    icon: '💲',
    tabs: [
      { k: 'rates',       label: 'Rate Manager' },
      { k: 'ratehistory', label: 'Rate History' },
      { k: 'payers',      label: 'Payers' },
      { k: 'comparison',  label: 'Payer Compare' },
      { k: 'rules',       label: 'Billing Rules' },
    ],
    adminOnly: true,
  },
  {
    label: 'Reports',
    icon: '📊',
    tabs: [
      { k: 'dashboard',    label: 'Dashboard' },
      { k: 'productivity', label: 'Productivity' },
      { k: 'report',       label: 'Monthly Report' },
      { k: 'yoy',          label: 'Year over Year' },
    ],
  },
  {
    label: 'Admin',
    icon: '⚙️',
    tabs: [
      { k: 'providers', label: 'Providers' },
      { k: 'users',     label: 'Users' },
      { k: 'data',      label: 'Import/Export' },
      { k: 'log',       label: 'Activity Log' },
    ],
    adminOnly: true,
  },
];

export default function GroupedNav({ activeTab, onTabChange, isAdmin }) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Find which group the active tab belongs to
  const activeGroup = NAV_GROUPS.find(g => g.tabs.some(t => t.k === activeTab));

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || isAdmin);

  return (
    <nav className="grouped-nav" ref={navRef}>
      {visibleGroups.map(group => {
        const isActive = activeGroup === group;
        const isOpen = openGroup === group.label;
        const isSingleTab = group.tabs.length === 1;

        return (
          <div key={group.label} className="nav-group">
            <button
              className={`nav-group-btn${isActive ? ' active' : ''}`}
              onClick={() => {
                if (isSingleTab) {
                  onTabChange(group.tabs[0].k);
                  setOpenGroup(null);
                } else {
                  setOpenGroup(isOpen ? null : group.label);
                }
              }}
            >
              <span className="nav-group-icon">{group.icon}</span>
              <span className="nav-group-label">{group.label}</span>
              {!isSingleTab && <span className="nav-group-arrow">{isOpen ? '▲' : '▼'}</span>}
            </button>

            {isOpen && !isSingleTab && (
              <div className="nav-dropdown">
                {group.tabs.map(t => (
                  <button
                    key={t.k}
                    className={`nav-dropdown-item${activeTab === t.k ? ' active' : ''}`}
                    onClick={() => { onTabChange(t.k); setOpenGroup(null); }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
