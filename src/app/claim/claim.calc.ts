import { EUR_RATE } from './claim.config';
import type { Category, Expense, ExpenseClaim } from './claim.model';

/** Amount of a single expense in its own currency (car = km × rate). */
export function expenseAmount(e: Expense): number {
  return e.category === 'car' ? round2(e.km * e.ratePerKm) : e.amount;
}

/** Amount of a single expense converted to PLN. */
export function expenseAmountPln(e: Expense): number {
  const amount = expenseAmount(e);
  return e.category !== 'car' && e.currency === 'EUR' ? round2(amount * EUR_RATE) : amount;
}

/** Total of all expenses in PLN — derived, never stored in the model. */
export function claimTotal(claim: Pick<ExpenseClaim, 'expenses'>): number {
  return round2(claim.expenses.reduce((sum, e) => sum + (expenseAmountPln(e) || 0), 0));
}

export function totalsByCategory(expenses: readonly Expense[]): Map<Category, number> {
  const map = new Map<Category, number>();
  for (const e of expenses) {
    map.set(e.category, round2((map.get(e.category) ?? 0) + (expenseAmountPln(e) || 0)));
  }
  return map;
}

/** Inclusive number of days between two ISO dates, or 0 when one is missing. */
export function tripDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const ms = Date.parse(endDate) - Date.parse(startDate);
  return Math.round(ms / 86_400_000) + 1;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const moneyFormat = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(n: number): string {
  return moneyFormat.format(n);
}
