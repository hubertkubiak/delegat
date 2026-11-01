import { CAR_RATE_PER_KM } from './claim.config';

export type Category = 'transport' | 'car' | 'hotel' | 'meal' | 'other';
export type Currency = 'PLN' | 'EUR';
export type DepartmentCode = '' | 'SALES' | 'IT' | 'OPS';
export type PayoutMethod = 'transfer' | 'cash';

export interface Address {
  city: string;
  postalCode: string;
  country: string;
}

export interface Expense {
  id: string;
  category: Category;
  date: string;
  amount: number;
  currency: Currency;
  description: string;
  receiptNo: string;
  km: number;
  ratePerKm: number;
  nights: number;
  attendees: number;
}

export interface ExtraField {
  key: string;
  label: string;
  kind: 'text' | 'number';
  required: boolean;
  hint: string;
  value: string;
}

export interface ExpenseClaim {
  employee: {
    fullName: string;
    email: string;
    department: DepartmentCode;
    costCenter: string;
  };
  trip: {
    purpose: string;
    destination: Address;
    startDate: string;
    endDate: string;
    abroad: boolean;
  };
  expenses: Expense[];
  extras: ExtraField[];
  payout: {
    method: PayoutMethod;
    iban: string;
    hadAdvance: boolean;
    advance: number;
  };
  approverEmail: string;
  notes: string;
  declaration: boolean;
}

/** Signal Forms treats `undefined` as a missing field, so every leaf gets a concrete initial value. */
export function emptyClaim(): ExpenseClaim {
  return {
    employee: { fullName: '', email: '', department: '', costCenter: '' },
    trip: {
      purpose: '',
      destination: { city: '', postalCode: '', country: 'PL' },
      startDate: '',
      endDate: '',
      abroad: false,
    },
    expenses: [],
    extras: [],
    payout: { method: 'transfer', iban: '', hadAdvance: false, advance: 0 },
    approverEmail: '',
    notes: '',
    declaration: false,
  };
}

export function newExpense(category: Category = 'transport'): Expense {
  return {
    id: crypto.randomUUID(),
    category,
    date: '',
    amount: 0,
    currency: 'PLN',
    description: '',
    receiptNo: '',
    km: 0,
    ratePerKm: CAR_RATE_PER_KM,
    nights: 1,
    attendees: 1,
  };
}

/** A complete, valid claim used by the "fill with sample data" link. */
export function sampleClaim(): ExpenseClaim {
  return {
    employee: {
      fullName: 'Anna Kowalska',
      email: 'anna.kowalska@firma.pl',
      department: 'SALES',
      costCenter: 'MPK-1001',
    },
    trip: {
      purpose: 'Spotkanie z klientem i prezentacja oferty',
      destination: { city: 'Gdańsk', postalCode: '80-001', country: 'PL' },
      startDate: '2026-10-12',
      endDate: '2026-10-14',
      abroad: false,
    },
    expenses: [
      {
        ...newExpense('transport'),
        date: '2026-10-12',
        amount: 189,
        description: 'Pociąg Warszawa – Gdańsk',
        receiptNo: 'PKP/2026/55821',
      },
      {
        ...newExpense('hotel'),
        date: '2026-10-12',
        amount: 640,
        nights: 2,
        description: 'Hotel przy dworcu',
        receiptNo: 'FV/10/2026/118',
      },
      {
        ...newExpense('meal'),
        date: '2026-10-13',
        amount: 96.5,
        attendees: 2,
        description: 'Lunch z klientem',
      },
    ],
    extras: [
      {
        key: 'crmId',
        label: 'Numer klienta / CRM',
        kind: 'text',
        required: true,
        hint: '',
        value: 'CRM-4821',
      },
      {
        key: 'meetings',
        label: 'Liczba spotkań',
        kind: 'number',
        required: false,
        hint: '',
        value: '3',
      },
    ],
    payout: {
      method: 'transfer',
      iban: 'PL61 1090 1014 0000 0712 1981 2874',
      hadAdvance: true,
      advance: 300,
    },
    approverEmail: 'jan.nowak@firma.pl',
    notes: '',
    declaration: true,
  };
}
