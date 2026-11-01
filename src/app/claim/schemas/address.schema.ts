import { pattern, required, schema } from '@angular/forms/signals';
import { POSTAL_CODE_PL_PATTERN } from '../claim.config';
import { apiBadge, helpText } from '../claim.metadata';
import type { Address } from '../claim.model';

// [SF] schema<T>() — reusable address rules, applied with apply()
export const addressSchema = schema<Address>((a) => {
  required(a.city, { message: 'Podaj miasto' });
  required(a.country, { message: 'Wybierz kraj' });

  // [SF] required({ when }) — postal code only for Poland
  required(a.postalCode, {
    when: ({ valueOf }) => valueOf(a.country) === 'PL',
    message: 'Podaj kod pocztowy',
  });
  // [SF] pattern — with `when`, the format check also applies only to Poland
  pattern(a.postalCode, POSTAL_CODE_PL_PATTERN, {
    when: ({ valueOf }) => valueOf(a.country) === 'PL',
    message: 'Format: 00-000',
  });
  helpText(a.postalCode, 'Wymagany dla Polski (format 00-000)');

  apiBadge(a.city, 'required');
  apiBadge(a.country, 'required');
  apiBadge(a.postalCode, 'required({ when })', 'pattern');
});
