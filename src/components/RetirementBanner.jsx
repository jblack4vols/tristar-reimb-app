import { useLayoutEffect, useRef } from 'react';

const MAIN_APP_URL = 'https://tristar-reimbursement.vercel.app';

export default function RetirementBanner() {
  const bannerRef = useRef(null);

  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el) return undefined;

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--retirement-banner-height',
        `${el.offsetHeight}px`,
      );
    };

    syncHeight();
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(syncHeight);
    if (observer) observer.observe(el);

    return () => {
      if (observer) observer.disconnect();
      document.documentElement.style.removeProperty('--retirement-banner-height');
    };
  }, []);

  return (
    <div
      ref={bannerRef}
      className="retirement-banner"
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2100,
        background: '#fef3c7',
        color: '#78350f',
        padding: '10px 16px',
        borderBottom: '1px solid #f59e0b',
        fontSize: 14,
        lineHeight: 1.45,
        textAlign: 'center',
        fontWeight: 600,
      }}
    >
      This calculator is being retired and its rates are out of date. For current
      rates and PTA/COTA reductions, use the{' '}
      <a
        href={MAIN_APP_URL}
        style={{ color: '#78350f', fontWeight: 800, textDecoration: 'underline' }}
      >
        Tristar Reimbursement Calculator
      </a>
      .
    </div>
  );
}
