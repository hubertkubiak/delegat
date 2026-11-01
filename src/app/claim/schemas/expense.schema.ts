import {
  applyWhen,
  hidden,
  max,
  maxLength,
  min,
  readonly,
  required,
  schema,
} from '@angular/forms/signals';
import { apiBadge, helpText } from '../claim.metadata';
import type { Category, Expense } from '../claim.model';

export const RECEIPT_THRESHOLD = 100;

// [SF] schema<T>() — rules for private car (mileage)
export const carSchema = schema<Expense>((e) => {
  required(e.km, { message: 'Podaj liczbę kilometrów' });
  // [SF] min / max with { message }
  min(e.km, 1, { message: 'Co najmniej 1 km' });
  max(e.km, 2000, { message: 'Maksymalnie 2000 km na jeden wpis' });
});

// [SF] schema<T>() — rules for hotel nights
export const hotelSchema = schema<Expense>((e) => {
  min(e.nights, 1, { message: 'Co najmniej 1 noc' });
  max(e.nights, 30, { message: 'Maksymalnie 30 nocy' });
  min(e.amount, 1, { message: 'Kwota musi wynosić co najmniej 1' });
});

// [SF] schema<T>() — rules for business meals
export const mealSchema = schema<Expense>((e) => {
  min(e.attendees, 1, { message: 'Co najmniej 1 osoba' });
  max(e.attendees, 20, { message: 'Maksymalnie 20 osób' });
  min(e.amount, 1, { message: 'Kwota musi wynosić co najmniej 1' });
});

/** Rules shared by every non-car expense. */
const amountSchema = schema<Expense>((e) => {
  min(e.amount, 0.01, { message: 'Kwota musi być większa od zera' });
  max(e.amount, 50_000, { message: 'Maksymalnie 50 000 na jeden wydatek' });
});

// [SF] schema<T>() — base rules for every expense, applied with applyEach()
export const expenseSchema = schema<Expense>((e) => {
  const is =
    (...categories: Category[]) =>
    ({ valueOf }: { valueOf: (p: typeof e.category) => Category }) =>
      categories.includes(valueOf(e.category));

  required(e.category, { message: 'Wybierz kategorię' });
  required(e.date, { message: 'Podaj datę wydatku' });
  maxLength(e.description, 120, { message: 'Opis: maksymalnie 120 znaków' });

  // [SF] required({ when }) — receipt number above the threshold (car mileage needs no receipt)
  required(e.receiptNo, {
    when: ({ valueOf }) => valueOf(e.amount) > RECEIPT_THRESHOLD && valueOf(e.category) !== 'car',
    message: `Powyżej ${RECEIPT_THRESHOLD} zł podaj numer paragonu lub faktury`,
  });

  // [SF] hidden({ when }) — fields shown only for the matching category
  hidden(e.km, { when: (ctx) => !is('car')(ctx) });
  hidden(e.ratePerKm, { when: (ctx) => !is('car')(ctx) });
  hidden(e.nights, { when: (ctx) => !is('hotel')(ctx) });
  hidden(e.attendees, { when: (ctx) => !is('meal')(ctx) });
  hidden(e.amount, { when: is('car') });
  hidden(e.currency, { when: is('car') });

  // [SF] readonly — mileage rate comes from configuration
  readonly(e.ratePerKm);

  // [SF] applyWhen — category-specific rule sets
  applyWhen(e, is('car'), carSchema);
  applyWhen(e, is('hotel'), hotelSchema);
  applyWhen(e, is('meal'), mealSchema);
  applyWhen(e, is('transport', 'other'), amountSchema);

  helpText(e.receiptNo, `Wymagany powyżej ${RECEIPT_THRESHOLD} zł`);
  helpText(e.ratePerKm, 'Stawka przykładowa — ustalana w konfiguracji');

  apiBadge(e.category, 'FormValueControl<Category>', 'required');
  apiBadge(e.date, 'required', 'validate (zakres delegacji)');
  apiBadge(e.amount, 'FormValueControl<number>', 'hidden({ when })', 'applyWhen → min/max');
  apiBadge(e.currency, 'disabled({ when }) → reason');
  apiBadge(e.description, 'maxLength');
  apiBadge(e.receiptNo, 'required({ when })');
  apiBadge(e.km, 'hidden({ when })', 'applyWhen(carSchema)');
  apiBadge(e.ratePerKm, 'readonly');
  apiBadge(e.nights, 'applyWhen(hotelSchema)');
  apiBadge(e.attendees, 'applyWhen(mealSchema)');
});
