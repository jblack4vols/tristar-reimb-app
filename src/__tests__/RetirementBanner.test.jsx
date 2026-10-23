import { render, screen } from '@testing-library/react';
import RetirementBanner from '../components/RetirementBanner';

const MAIN_APP_URL = 'https://tristar-reimbursement.vercel.app';

describe('RetirementBanner', () => {
  it('tells people this calculator is retired and links to the current app', () => {
    render(<RetirementBanner />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This calculator is being retired and its rates are out of date.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'For current rates and PTA/COTA reductions, use the Tristar Reimbursement Calculator.',
    );

    const link = screen.getByRole('link', { name: 'Tristar Reimbursement Calculator' });
    expect(link).toHaveAttribute('href', MAIN_APP_URL);
  });
});
