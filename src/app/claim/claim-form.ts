import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
  type WritableSignal,
} from '@angular/core';
import {
  apply,
  applyEach,
  debounce,
  disabled,
  email,
  type FieldTree,
  form,
  hidden,
  maxLength,
  metadata,
  min,
  minLength,
  pattern,
  required,
  submit,
  type TreeValidationResult,
  validate,
  validateHttp,
  validateStandardSchema,
  validateTree,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { CostCenterDirectory } from '../core/cost-center-directory.service';
import {
  type ClaimCreatedResponse,
  type CostCenterResponse,
  isCostCenterResponse,
  type ServerFieldError,
} from '../core/cost-center.types';
import { claimTotal } from './claim.calc';
import { COST_CENTER_PATTERN, IBAN_PL_PATTERN } from './claim.config';
import { apiBadge, HELP_TEXT, helpText } from './claim.metadata';
import type { ExpenseClaim } from './claim.model';
import { addressSchema } from './schemas/address.schema';
import { expenseSchema } from './schemas/expense.schema';
import { standardTripSchema, strictTripSchema } from './schemas/trip.zod';

export type ClaimForm = FieldTree<ExpenseClaim>;

export interface ClaimFormOptions {
  /** Switches the Zod schema used for the `trip` section. */
  strictPolicy: Signal<boolean>;
  /** Called after the mock backend accepted the claim. */
  onSubmitted?: (id: string) => void;
  /** Called when submission is blocked by validation errors (not by pending validators). */
  onInvalid?: (form: ClaimForm) => void;
  /** Toggled while a submission waits for async validators to settle. */
  awaitingValidation?: WritableSignal<boolean>;
}

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/** Resolves once no validator in the tree is pending. */
export function whenSettled(f: FieldTree<unknown>, injector: Injector): Promise<void> {
  return new Promise((resolve) => {
    const ref = effect(
      () => {
        if (!f().pending()) {
          ref.destroy();
          resolve();
        }
      },
      { injector, manualCleanup: true },
    );
  });
}

/**
 * Builds the whole claim form: schema, cross-field rules, async validation and submission.
 * Must be called in an injection context.
 */
export function buildClaimForm(
  model: WritableSignal<ExpenseClaim>,
  opts: ClaimFormOptions,
): ClaimForm {
  const http = inject(HttpClient);
  const injector = inject(Injector);
  const directory = inject(CostCenterDirectory);

  const submitClaim = async (f: ClaimForm): Promise<TreeValidationResult> => {
    try {
      const res = await firstValueFrom(http.post<ClaimCreatedResponse>('/api/claims', f().value()));
      opts.onSubmitted?.(res.id);
      return undefined;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 422) {
        const body = err.error as ServerFieldError;
        // Focus runs after render, by which time the returned error is attached to its field.
        opts.onInvalid?.(f);
        const targets: Record<string, FieldTree<unknown>> = {
          'trip.purpose': f.trip.purpose,
          'employee.costCenter': f.employee.costCenter,
          approverEmail: f.approverEmail,
        };
        // [SF] submission.action — server error mapped onto a field via `fieldTree`
        return { kind: 'server', message: body.message, fieldTree: targets[body.field] ?? f };
      }
      return {
        kind: 'server',
        message: 'Nie udało się wysłać wniosku. Spróbuj ponownie.',
        fieldTree: f,
      };
    }
  };

  // [SF] form(model, schemaFn, { submission })
  const claimForm: ClaimForm = form(
    model,
    (f) => {
      /* ───────────── Employee ───────────── */
      // [SF] required / minLength with { message }
      required(f.employee.fullName, { message: 'Podaj imię i nazwisko' });
      minLength(f.employee.fullName, 3, { message: 'Co najmniej 3 znaki' });
      // [SF] debounce(path, 'blur') — model updates when the field loses focus
      debounce(f.employee.fullName, 'blur');

      // [SF] required / email
      required(f.employee.email, { message: 'Podaj adres e-mail' });
      email(f.employee.email, { message: 'Niepoprawny adres e-mail' });

      required(f.employee.department, { message: 'Wybierz dział' });

      required(f.employee.costCenter, { message: 'Podaj numer MPK' });
      // [SF] pattern with { message }
      pattern(f.employee.costCenter, COST_CENTER_PATTERN, { message: 'Format: MPK-0000' });
      // [SF] validateHttp with debounce — runs only once sync validators pass
      validateHttp<string, CostCenterResponse>(f.employee.costCenter, {
        request: ({ value }) =>
          COST_CENTER_PATTERN.test(value())
            ? `/api/cost-centers/${encodeURIComponent(value())}`
            : undefined,
        debounce: 400,
        options: {
          parse: (raw) => {
            if (!isCostCenterResponse(raw)) throw new Error('Unexpected cost-center response');
            directory.remember(raw);
            return raw;
          },
        },
        onSuccess: (res) => (res.active ? null : { kind: 'inactive', message: 'MPK nieaktywne' }),
        onError: () => ({ kind: 'not-found', message: 'Nie znaleziono MPK' }),
      });

      helpText(f.employee.fullName, 'Model aktualizuje się dopiero po opuszczeniu pola');
      helpText(f.employee.costCenter, 'Miejsce powstawania kosztów, np. MPK-1001');
      apiBadge(f.employee.fullName, 'required', 'minLength', "debounce('blur')");
      apiBadge(f.employee.email, 'required', 'email');
      apiBadge(f.employee.department, 'required', 'httpResource → model.update');
      apiBadge(f.employee.costCenter, 'pattern', 'validateHttp');

      /* ───────────── Trip ───────────── */
      // [SF] validateStandardSchema — dynamic: the lambda picks the Zod schema reactively
      validateStandardSchema(f.trip, () =>
        opts.strictPolicy() ? strictTripSchema : standardTripSchema,
      );

      // [SF] validate — cross-field: end date not before start date (valueOf)
      validate(f.trip.endDate, ({ value, valueOf }) => {
        const start = valueOf(f.trip.startDate);
        return value() && start && value() < start
          ? {
              kind: 'date-order',
              message: 'Data powrotu nie może być wcześniejsza niż data wyjazdu',
            }
          : null;
      });

      // [SF] apply — reusable address schema
      apply(f.trip.destination, addressSchema);

      helpText(f.trip.purpose, 'Opisz, czego dotyczył wyjazd');
      apiBadge(f.trip.purpose, 'validateStandardSchema (Zod)');
      apiBadge(f.trip.startDate, 'validateStandardSchema (Zod)');
      apiBadge(f.trip.endDate, 'validateStandardSchema (Zod)', 'validate + valueOf');
      apiBadge(f.trip.abroad, 'FormCheckboxControl');

      /* ───────────── Expenses ───────────── */
      // [SF] minLength on an array — `required` accepts an empty array
      minLength(f.expenses, 1, { message: 'Dodaj co najmniej jeden wydatek' });

      // [SF] applyEach — shared expense schema for every row
      applyEach(f.expenses, expenseSchema);
      // [SF] applyEach — inline schema with access to the root via closure
      applyEach(f.expenses, (item) => {
        // [SF] validate — cross-field: expense date within the trip dates
        validate(item.date, ({ value, valueOf }) => {
          const start = valueOf(f.trip.startDate);
          const end = valueOf(f.trip.endDate);
          if (!value() || !start || !end) return null;
          return value() < start || value() > end
            ? { kind: 'out-of-trip', message: 'Data wydatku poza terminem delegacji' }
            : null;
        });
        // [SF] disabled({ when }) returning a string reason
        disabled(item.currency, {
          when: ({ valueOf }) =>
            valueOf(f.trip.abroad) ? false : 'Waluta obca tylko dla delegacji zagranicznych',
        });
      });

      /* ───────────── Department extras ───────────── */
      // [SF] applyEach — dynamic fields loaded from department config
      applyEach(f.extras, (extra) => {
        // [SF] required({ when }) — driven by the field's own config
        required(extra.value, {
          when: ({ valueOf }) => valueOf(extra.required),
          message: 'To pole jest wymagane',
        });
        validate(extra.value, ({ value, valueOf }) =>
          valueOf(extra.kind) === 'number' &&
          value().trim() !== '' &&
          !Number.isFinite(Number(value().replace(',', '.')))
            ? { kind: 'number', message: 'Wpisz liczbę' }
            : null,
        );
        // [SF] metadata — HELP_TEXT computed from the field config
        metadata(extra.value, HELP_TEXT, ({ valueOf }) => valueOf(extra.hint));
        apiBadge(extra.value, 'applyEach', 'required({ when })');
      });

      /* ───────────── Payout ───────────── */
      // [SF] hidden({ when }) — IBAN only for bank transfer
      hidden(f.payout.iban, { when: ({ valueOf }) => valueOf(f.payout.method) === 'cash' });
      required(f.payout.iban, { message: 'Podaj numer rachunku' });
      validate(f.payout.iban, ({ value }) =>
        value() && !IBAN_PL_PATTERN.test(normalizeIban(value()))
          ? { kind: 'iban', message: 'Format: PL + 26 cyfr' }
          : null,
      );
      // [SF] disabled({ when }) returning a string reason
      disabled(f.payout.advance, {
        when: ({ valueOf }) =>
          valueOf(f.payout.hadAdvance) ? false : 'Najpierw zaznacz „Pobrano zaliczkę”',
      });
      min(f.payout.advance, 0.01, { message: 'Podaj kwotę zaliczki' });

      // [SF] validateTree — error is attached to payout.advance, not to the root
      validateTree(f, ({ value, fieldTree }) => {
        const { hadAdvance, advance } = value().payout;
        return hadAdvance && advance > claimTotal(value())
          ? {
              kind: 'advance-too-high',
              message: 'Zaliczka przekracza sumę wydatków — różnicę zwrócisz w kasie',
              fieldTree: fieldTree.payout.advance,
            }
          : null;
      });

      helpText(f.payout.iban, 'Grupy po 4 znaki formatują się po opuszczeniu pola');
      apiBadge(f.payout.method, 'native radio [formField]');
      apiBadge(f.payout.iban, 'hidden({ when })', 'validate');
      apiBadge(f.payout.hadAdvance, 'FormCheckboxControl');
      apiBadge(f.payout.advance, 'disabled({ when }) → reason', 'validateTree');

      /* ───────────── Approval ───────────── */
      required(f.approverEmail, { message: 'Podaj e-mail osoby akceptującej' });
      email(f.approverEmail, { message: 'Niepoprawny adres e-mail' });
      // [SF] validate — cross-field: approver must differ from the employee
      validate(f.approverEmail, ({ value, valueOf }) =>
        value() && value().trim().toLowerCase() === valueOf(f.employee.email).trim().toLowerCase()
          ? { kind: 'self-approval', message: 'Nie możesz zaakceptować własnego wniosku' }
          : null,
      );

      // [SF] maxLength + debounce(path, 300)
      maxLength(f.notes, 500, { message: 'Maksymalnie 500 znaków' });
      debounce(f.notes, 300);

      // [SF] required — `false` counts as empty for a checkbox
      required(f.declaration, { message: 'Potwierdź zgodność z polityką' });

      helpText(f.notes, 'Licznik pokazuje wartość w kontrolce i w modelu (debounce 300 ms)');
      apiBadge(f.approverEmail, 'required', 'email', 'validate + valueOf');
      apiBadge(f.notes, 'maxLength', 'debounce(300)');
      apiBadge(f.declaration, 'FormCheckboxControl', 'required');
    },
    {
      name: 'claim',
      submission: {
        // [SF] ignoreValidators: 'none' — pending validators block the action
        ignoreValidators: 'none',
        action: (f) => submitClaim(f),
        // [SF] onInvalid — waits for pending async validators, otherwise reports errors
        onInvalid: (f) => {
          if (untracked(f().pending)) {
            opts.awaitingValidation?.set(true);
            void whenSettled(f, injector).then(() => {
              opts.awaitingValidation?.set(false);
              // [SF] submit — retry once validation has settled
              void submit(f);
            });
            return;
          }
          opts.onInvalid?.(f);
        },
      },
    },
  );

  return claimForm;
}
