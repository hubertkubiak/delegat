import {
  Component,
  computed,
  effect,
  type ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import {
  type DisabledReason,
  type FormValueControl,
  transformedValue,
  type ValidationError,
  type WithOptionalFieldTree,
} from '@angular/forms/signals';
import { FieldErrorsComponent } from '../field/field-errors.component';
import { errorsId, fieldId } from '../field/field-ids';

const display = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoneyInput(value: number): string {
  return value ? display.format(value) : '';
}

/** Accepts "1 234,50", "1234.5", "1234,5" (spaces / NBSP as thousands separators). */
export function parseMoneyInput(raw: string): number | null {
  const s = raw.replace(/[\s\u00a0\u202f]/g, '');
  if (s === '') return 0;
  if (!/^-?\d+([.,]\d{1,2})?$/.test(s)) return null;
  return Number(s.replace(',', '.'));
}

// [SF] FormValueControl<number> — custom money input
@Component({
  selector: 'app-money-input',
  imports: [FieldErrorsComponent],
  host: {
    class: 'money',
    '[class.money--disabled]': 'disabled()',
    '[class.is-invalid]': 'showInvalid()',
    '[class.is-pending]': 'pending()',
  },
  template: `
    <div class="money__box">
      <input
        #input
        class="input money__input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0,00"
        [id]="ids().control"
        [attr.name]="name() || null"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        [attr.aria-required]="required() || null"
        [attr.aria-invalid]="showInvalid() || null"
        [attr.aria-describedby]="ids().errors"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-labelledby]="ariaLabelledby() || null"
        (input)="onInput($event)"
        (blur)="onBlur()"
      />
      <span class="money__suffix" aria-hidden="true">{{ currency() }}</span>
    </div>
    <app-field-errors
      [errorId]="ids().errors"
      [errors]="errors()"
      [show]="touched()"
      [disabledReasons]="disabledReasons()"
    />
  `,
})
export class MoneyInputComponent implements FormValueControl<number> {
  readonly value = model(0);

  // [SF] optional control inputs — bound automatically by [formField]
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = input(false);
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly pending = input(false);
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly name = input('');
  readonly touch = output<void>();

  readonly currency = input('PLN');
  readonly ariaLabel = input('');
  readonly ariaLabelledby = input('');

  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  // [SF] transformedValue — string in the UI, number in the model, parse errors reported to the field
  protected readonly rawValue = transformedValue(this.value, {
    format: formatMoneyInput,
    parse: (raw: string) => {
      const n = parseMoneyInput(raw);
      return n === null
        ? { error: { kind: 'parse', message: 'Wpisz kwotę, np. 120,50' } }
        : { value: n };
    },
  });

  protected readonly showInvalid = computed(() => this.touched() && this.invalid());
  protected readonly ids = computed(() => ({
    control: fieldId(this.name() || 'money'),
    errors: errorsId(this.name() || 'money'),
  }));

  constructor() {
    // Keep the DOM in sync with the formatted value, but never rewrite it under the user's cursor.
    effect(() => {
      const raw = this.rawValue();
      const el = this.inputEl().nativeElement;
      if (el !== el.ownerDocument.activeElement && el.value !== raw) el.value = raw;
    });
  }

  protected onInput(event: Event): void {
    this.rawValue.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    const el = this.inputEl().nativeElement;
    if (this.rawValue.parseErrors().length === 0) {
      el.value = formatMoneyInput(this.value());
    }
    this.touch.emit();
  }

  // [SF] focus() — lets focusBoundControl() / errorSummary navigation reach the inner input
  focus(options?: FocusOptions): void {
    const el = this.inputEl().nativeElement;
    el.focus(options);
    el.select();
  }
}
