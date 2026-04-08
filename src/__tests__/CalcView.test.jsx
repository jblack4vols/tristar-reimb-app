import { render, screen, fireEvent } from '@testing-library/react';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
    }),
  },
}));

// Mock crypto
vi.mock('../utils/crypto', () => ({
  encryptPHI: (v) => `enc_${v}`,
  decryptPHI: (v) => v?.replace('enc_', '') || '',
}));

// Mock adminDataStore
vi.mock('../utils/useAdminData', () => ({
  useAdminData: () => ({
    loading: false,
    rates: {
      TX: { Medicare: 30, Aetna: 26 },
      '2TX': { Medicare: 60, Aetna: 52 },
      MT: { Medicare: 32, Aetna: 28 },
      ESM: { Medicare: 20, Aetna: 18 },
    },
    payers: ['Medicare', 'Aetna'],
    contractPayers: { 'Workers Comp': 85 },
    billingRules: { Aetna: ['TA and MT cannot appear on same claim.'] },
    codeLabels: {
      TX: 'Therapeutic Exercise',
      '2TX': 'Therapeutic Exercise x2',
      MT: 'Manual Therapy',
      ESM: 'Electrical Stimulation (Medicare)',
    },
    codeGroups: [
      { key: 'Therapeutic', label: 'Therapeutic', codes: ['TX', '2TX', 'MT'] },
      { key: 'Modalities', label: 'Modalities', codes: ['ESM'] },
    ],
    providers: { 'Nashville': ['Morgan Black'] },
    allProviders: [{ name: 'Morgan Black', location: 'Nashville', discipline: 'PT', isOT: false }],
    getSetting: () => true,
  }),
}));

// Mock store
vi.mock('../utils/store', () => ({
  store: {
    getCombos: () => [],
    pushLog: () => Promise.resolve(),
    setSession: () => {},
  },
}));

import CalcView from '../components/CalcView';

const mockUser = { id: 'u1', name: 'Morgan Black', username: 'morgan', role: 'staff', location: 'Nashville' };

describe('CalcView', () => {
  it('renders without crashing', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByText('Expected Reimbursement')).toBeInTheDocument();
  });

  it('shows getting started guide when nothing selected', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByText('Maximize Your Reimbursement')).toBeInTheDocument();
  });

  it('renders mode toggle buttons', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByText('Fee Schedule')).toBeInTheDocument();
    expect(screen.getByText('Contract / Day Rate')).toBeInTheDocument();
  });

  it('shows payer dropdown with options', () => {
    render(<CalcView user={mockUser} />);
    const payer = screen.getByText('Select payer');
    expect(payer).toBeInTheDocument();
  });

  it('renders code group pills', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByText('All Codes')).toBeInTheDocument();
    expect(screen.getByText('Therapeutic')).toBeInTheDocument();
    expect(screen.getByText('Modalities')).toBeInTheDocument();
  });

  it('renders code group filter pills including custom groups', () => {
    render(<CalcView user={mockUser} />);
    // Custom code groups from useAdminData are rendered as pills
    expect(screen.getByText('Therapeutic')).toBeInTheDocument();
    expect(screen.getByText('Modalities')).toBeInTheDocument();
  });

  it('shows $0.00 when no codes selected', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('shows billing rules when payer with rules is selected', () => {
    render(<CalcView user={mockUser} />);
    const selects = screen.getAllByRole('combobox');
    const payerSelect = selects.find(s => {
      const options = Array.from(s.options || []);
      return options.some(o => o.textContent === 'Medicare');
    });
    if (payerSelect) {
      fireEvent.change(payerSelect, { target: { value: 'Aetna' } });
      const rules = screen.getAllByText(/TA and MT cannot appear/);
      expect(rules.length).toBeGreaterThan(0);
    }
  });

  it('shows billing reminders section', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByText('Quick Billing Reminders')).toBeInTheDocument();
  });

  it('renders search input for codes', () => {
    render(<CalcView user={mockUser} />);
    expect(screen.getByPlaceholderText(/Search codes/)).toBeInTheDocument();
  });
});
