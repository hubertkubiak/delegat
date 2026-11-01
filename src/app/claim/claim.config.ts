import type { Category, Currency, DepartmentCode } from './claim.model';

/** Example mileage rate (PLN per km); the UI labels it as an example rate. */
export const CAR_RATE_PER_KM = 0.89;

/** Illustrative EUR → PLN rate; the UI labels it as indicative. */
export const EUR_RATE = 4.3;

export const COST_CENTER_PATTERN = /^MPK-\d{4}$/;
export const POSTAL_CODE_PL_PATTERN = /^\d{2}-\d{3}$/;
export const IBAN_PL_PATTERN = /^PL\d{26}$/;

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const DEPARTMENTS: readonly Option<Exclude<DepartmentCode, ''>>[] = [
  { value: 'SALES', label: 'Sprzedaż' },
  { value: 'IT', label: 'IT' },
  { value: 'OPS', label: 'Operacje' },
];

export const COUNTRIES: readonly Option<string>[] = [
  { value: 'PL', label: 'Polska' },
  { value: 'DE', label: 'Niemcy' },
  { value: 'CZ', label: 'Czechy' },
  { value: 'FR', label: 'Francja' },
  { value: 'NL', label: 'Holandia' },
  { value: 'GB', label: 'Wielka Brytania' },
];

export const CURRENCIES: readonly Option<Currency>[] = [
  { value: 'PLN', label: 'PLN' },
  { value: 'EUR', label: 'EUR' },
];

export interface CategoryInfo {
  value: Category;
  label: string;
  /** SVG path data, drawn on a 24×24 stroke icon. */
  icon: string;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  {
    value: 'transport',
    label: 'Transport publiczny',
    icon: 'M6 3h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM4 11h16M8 21l2-3M16 21l-2-3M8 15h.01M16 15h.01',
  },
  {
    value: 'car',
    label: 'Samochód prywatny',
    icon: 'M5 17h14M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 13h18M7 15h.01M17 15h.01',
  },
  {
    value: 'hotel',
    label: 'Nocleg',
    icon: 'M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  },
  {
    value: 'meal',
    label: 'Posiłek',
    icon: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 0-4 2-4 6v4h4',
  },
  {
    value: 'other',
    label: 'Inne',
    icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  },
];

export function categoryInfo(category: Category): CategoryInfo {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[CATEGORIES.length - 1];
}
