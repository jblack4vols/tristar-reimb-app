import React from 'react';

export default function LoginScreen({ onLogin }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">T</div>
        <h1 className="login-title">Tristar PT</h1>
        <p className="login-subtitle">Reimbursement Calculator</p>
        <button className="btn btn-primary login-btn" onClick={onLogin}>
          Sign in with Microsoft
        </button>
        <p className="login-footer">
          Use your Tristar Physical Therapy Microsoft account to continue.
        </p>
      </div>
    </div>
  );
}
