const LOGO = 'https://tristarpt.com/wp-content/uploads/2021/01/tristar-logo.png';

export default function Header({ user, onLogout, badge }) {
  return (
    <div className="app-header">
      <div className="header-left">
        <img
          src={LOGO}
          alt="Tristar Physical Therapy"
          className="header-logo"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div>
          <div className="header-org">Tristar Physical Therapy</div>
          <div className="header-title">Reimbursement Calculator</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-badge">{badge}</div>
        <div className="header-name">{user.name}</div>
        <button className="header-signout" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
