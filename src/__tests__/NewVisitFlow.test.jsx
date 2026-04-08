import { render, screen } from '@testing-library/react';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [] }),
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
        }),
      }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
    }),
  },
}));

// Mock crypto
vi.mock('../utils/crypto', () => ({
  encryptPHI: (v) => `enc_${v}`,
  decryptPHI: (v) => v?.replace('enc_', '') || '',
}));

// Mock useAdminData
vi.mock('../utils/useAdminData', () => ({
  useAdminData: () => ({
    loading: false,
    rates: {
      TX: { Medicare: 30 },
      MT: { Medicare: 32 },
      'EVAL-62': { Medicare: 120 },
    },
    payers: ['Medicare', 'Aetna'],
    providers: { Nashville: ['Morgan Black'] },
    allProviders: [{ name: 'Morgan Black', location: 'Nashville', discipline: 'PT', isOT: false }],
    codeLabels: {
      TX: 'Therapeutic Exercise',
      MT: 'Manual Therapy',
      'EVAL-62': 'PT Eval Moderate',
    },
    codeGroups: [
      { key: 'Therapeutic', label: 'Therapeutic', codes: ['TX', 'MT'] },
    ],
  }),
}));

// Mock store
vi.mock('../utils/store', () => ({
  store: {
    getCombos: () => [],
    pushLog: () => Promise.resolve(),
  },
}));

// Mock validation
vi.mock('../utils/validation', () => ({
  validatePatientName: (n) => (!n || !n.trim()) ? 'Required' : null,
}));

import NewVisitFlow from '../components/NewVisitFlow';

const mockUser = { id: 'u1', name: 'Morgan Black', username: 'morgan', role: 'staff', location: 'Nashville' };

describe('NewVisitFlow', () => {
  it('renders without crashing', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByText('Select Patient')).toBeInTheDocument();
  });

  it('renders all 4 step sections', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByText('Select Patient')).toBeInTheDocument();
    expect(screen.getByText('Visit Details')).toBeInTheDocument();
    expect(screen.getByText('Codes')).toBeInTheDocument();
    expect(screen.getByText('Summary & Save')).toBeInTheDocument();
  });

  it('shows patient search input', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByPlaceholderText(/Search patients/)).toBeInTheDocument();
  });

  it('shows add new patient button', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByText('+ Add New Patient')).toBeInTheDocument();
  });

  it('shows provider dropdown', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByText('Select provider')).toBeInTheDocument();
  });

  it('shows payer dropdown', () => {
    render(<NewVisitFlow user={mockUser} />);
    // Multiple "Select payer" may exist
    const payers = screen.getAllByText('Select payer');
    expect(payers.length).toBeGreaterThan(0);
  });

  it('shows date input defaulting to today', () => {
    render(<NewVisitFlow user={mockUser} />);
    const today = new Date().toISOString().split('T')[0];
    const dateInput = screen.getByDisplayValue(today);
    expect(dateInput).toBeInTheDocument();
  });

  it('shows code search input', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByPlaceholderText(/Search codes/)).toBeInTheDocument();
  });

  it('shows Log Visit button (disabled initially)', () => {
    render(<NewVisitFlow user={mockUser} />);
    const logBtn = screen.getByText('Log Visit');
    expect(logBtn).toBeDisabled();
  });

  it('shows validation hint when nothing selected', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByText('Select a patient above')).toBeInTheDocument();
  });

  it('renders expected reimbursement as $0.00', () => {
    render(<NewVisitFlow user={mockUser} />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });
});
