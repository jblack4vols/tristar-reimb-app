import { useState } from 'react';

const NAV_GROUPS = [
  {
    label: 'Home',
    icon: '🏠',
    tabs: [
      { k: 'home', label: 'Home' },
      { k: 'guide', label: 'Quick Start Guide' },
    ],
  },
  {
    label: 'Clinical',
    icon: '🩺',
    tabs: [
      { k: 'calc',      label: 'Calculator' },
      { k: 'newvisit',  label: 'New Visit' },
      { k: 'batch',     label: 'Batch Entry' },
      { k: 'patients',  label: 'Patients' },
      { k: 'auths',     label: 'Authorizations' },
      { k: 'templates', label: 'Templates' },
    ],
  },
  {
    label: 'History',
    icon: '📋',
    tabs: [
      { k: 'visits', label: 'Visit History' },
      { k: 'combos', label: 'Saved Combos' },
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
      { k: 'backup',    label: 'Data Backup' },
      { k: 'log',       label: 'Activity Log' },
      { k: 'devguide',  label: 'Developer Guide' },
    ],
    adminOnly: true,
  },
];

export default function Sidebar({ activeTab, onTabChange, isAdmin, onSearchClick, onLogout, userName }) {
  const [openGroups, setOpenGroups] = useState(() => {
    // Open the group containing the active tab by default
    const active = NAV_GROUPS.find(g => g.tabs.some(t => t.k === activeTab));
    return active ? { [active.label]: true } : { Home: true };
  });

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || isAdmin);

  const toggleGroup = (label) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Keep active group open
  const activeGroup = NAV_GROUPS.find(g => g.tabs.some(t => t.k === activeTab));
  if (activeGroup && !openGroups[activeGroup.label]) {
    openGroups[activeGroup.label] = true;
  }

  return (
    <aside className="sidebar">
      {/* Logo area */}
      <div className="sidebar-logo">
        <img
          src="https://assets.cdn.filesafe.space/4OhLjdxKCuBxvgs4TpUU/media/6630c406f4d5b72faba066f0.jpeg"
          alt="Tristar PT"
          className="sidebar-logo-img"
          onError={e => { e.target.style.opacity = '0'; }}
        />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">Tristar PT</div>
          <div className="sidebar-logo-sub">Reimbursement Calc</div>
        </div>
      </div>

      {/* Search button */}
      {onSearchClick && (
        <button className="sidebar-search" onClick={onSearchClick}>
          <span>🔍</span>
          <span className="sidebar-search-text">Search</span>
          <span className="sidebar-search-kbd">⌘K</span>
        </button>
      )}

      {/* Navigation groups */}
      <nav className="sidebar-nav">
        {visibleGroups.map(group => {
          const isOpen = openGroups[group.label];
          const hasActiveTab = group.tabs.some(t => t.k === activeTab);

          return (
            <div key={group.label} className="sidebar-group">
              <button
                className={`sidebar-group-btn${hasActiveTab ? ' active' : ''}`}
                onClick={() => toggleGroup(group.label)}
              >
                <span className="sidebar-group-icon">{group.icon}</span>
                <span className="sidebar-group-label">{group.label}</span>
                <span className={`sidebar-group-chevron${isOpen ? ' open' : ''}`}>›</span>
              </button>

              {isOpen && (
                <div className="sidebar-group-items">
                  {group.tabs.map(t => (
                    <button
                      key={t.k}
                      className={`sidebar-item${activeTab === t.k ? ' active' : ''}`}
                      onClick={() => onTabChange(t.k)}
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

      {/* Footer — pinned to bottom */}
      <div className="sidebar-footer">
        <button
          className={`sidebar-footer-btn${activeTab === 'feedback' ? ' active' : ''}`}
          onClick={() => onTabChange('feedback')}
        >
          <span>💡</span>
          <span>Feature Requests</span>
        </button>
        {onLogout && (
          <button className="sidebar-footer-btn sidebar-logout-btn" onClick={onLogout}>
            <span>↩</span>
            <span>Sign Out</span>
            {userName && <span className="sidebar-footer-user">{userName}</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

// Mobile bottom bar — shows on small screens
export function MobileBottomBar({ activeTab, onTabChange, _isAdmin, onSearchClick }) {
  const MOBILE_TABS = [
    { k: 'home',    icon: '🏠', label: 'Home' },
    { k: 'newvisit', icon: '📝', label: 'Visit' },
    { k: 'patients', icon: '👥', label: 'Patients' },
    { k: 'calc',    icon: '🧮', label: 'Calc' },
    { k: 'search',  icon: '🔍', label: 'Search' },
  ];

  return (
    <nav className="mobile-bottom-bar">
      {MOBILE_TABS.map(t => (
        <button
          key={t.k}
          className={`mobile-tab${activeTab === t.k ? ' active' : ''}`}
          onClick={() => {
            if (t.k === 'search') { onSearchClick?.(); return; }
            onTabChange(t.k);
          }}
        >
          <span className="mobile-tab-icon">{t.icon}</span>
          <span className="mobile-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
