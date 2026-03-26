import { useState, useEffect } from 'react';

const STORAGE_KEY = 'trc_onboarding_done';

const SLIDES = [
  {
    icon: '🏥',
    title: 'Welcome to Tristar PT Reimbursement Calculator',
    description:
      'Your all-in-one tool for calculating reimbursements, tracking visits, and managing patient authorizations.',
  },
  {
    icon: '📝',
    title: 'Log Patient Visits',
    description:
      'Use the New Visit flow to quickly log visits with patient name, codes, and payer. Everything is saved and encrypted.',
  },
  {
    icon: '🧮',
    title: 'Calculate Reimbursements',
    description:
      'Select a payer and codes to instantly see expected reimbursement. Use the 8-minute rule tool for timed codes.',
  },
  {
    icon: '👥',
    title: 'Patient Directory',
    description:
      'Keep an encrypted directory of your patients. Quick-select patients when logging visits.',
  },
  {
    icon: '📋',
    title: 'Treatment Templates',
    description:
      'Save common code combinations by diagnosis. Apply templates with one tap.',
  },
  {
    icon: '✅',
    title: 'Track Authorizations',
    description:
      'Monitor approved vs used visits. Get alerts when authorizations are running low.',
  },
  {
    icon: '🔍',
    title: 'Search Anywhere',
    description:
      'Press Ctrl+K to search across patients, codes, and templates from any screen.',
  },
  {
    icon: '🎉',
    title: "You're All Set!",
    description:
      'Start by logging your first visit or exploring the dashboard.',
  },
];

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    maxWidth: 440,
    width: '90%',
    borderRadius: 20,
    padding: '32px 24px',
    textAlign: 'center',
  },
  slideLight: {
    background: '#fff',
  },
  slideDark: {
    background: '#2a2a2a',
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
    lineHeight: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  titleLight: {
    color: '#111',
  },
  titleDark: {
    color: '#e5e5e5',
  },
  description: {
    fontSize: 15,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  descriptionLight: {
    color: '#6b7280',
  },
  descriptionDark: {
    color: '#9ca3af',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'background 0.2s',
  },
};

export default function OnboardingTour({ onComplete, onNavigate }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark';

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    if (onComplete) onComplete();
  };

  const isLast = step === SLIDES.length - 1;
  const current = SLIDES[step];

  return (
    <div style={styles.overlay}>
      <div
        style={{
          ...styles.slide,
          ...(isDark ? styles.slideDark : styles.slideLight),
        }}
      >
        <div style={styles.icon}>{current.icon}</div>
        <div
          style={{
            ...styles.title,
            ...(isDark ? styles.titleDark : styles.titleLight),
          }}
        >
          {current.title}
        </div>
        <div
          style={{
            ...styles.description,
            ...(isDark ? styles.descriptionDark : styles.descriptionLight),
          }}
        >
          {current.description}
        </div>

        <div style={styles.buttons}>
          {isLast ? (
            <>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (onNavigate) onNavigate('newvisit');
                  finish();
                }}
              >
                Start New Visit
              </button>
              <button
                className="btn btn-muted"
                onClick={() => {
                  if (onNavigate) onNavigate('dashboard');
                  finish();
                }}
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
              >
                Next
              </button>
              <button className="btn btn-muted" onClick={handleSkip}>
                Skip
              </button>
            </>
          )}
        </div>

        <div style={styles.dots}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === step ? '#f97316' : '#e5e7eb',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
