import { Component, computed, inject, input, output, signal } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { DemoMode } from '../../core/demo-mode.service';
import { CategoryPickerComponent } from '../../ui/controls/category-picker.component';
import { MoneyInputComponent } from '../../ui/controls/money-input.component';
import { FIELD_IMPORTS, labelId } from '../../ui/field';
import { ICONS, IconComponent } from '../../ui/icon/icon.component';
import { expenseAmount, formatMoney } from '../claim.calc';
import { categoryInfo, CURRENCIES } from '../claim.config';
import type { Expense } from '../claim.model';

@Component({
  selector: 'app-expense-row',
  imports: [IconComponent, CategoryPickerComponent, MoneyInputComponent, ...FIELD_IMPORTS],
  host: {
    class: 'expense',
    '[class.expense--open]': 'expanded()',
    '[class.expense--invalid]': 'showInvalid()',
  },
  template: `
    @let e = item();
    <div class="expense__head">
      <button
        type="button"
        class="expense__toggle"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="bodyId()"
        (click)="open.set(!expanded())"
      >
        <span class="expense__icon"><app-icon [d]="info().icon" [size]="20" /></span>
        <span class="expense__title">
          <span class="expense__desc">{{ e.description().value() || info().label }}</span>
          <span class="expense__meta">
            {{ info().label }}
            @if (e.date().value()) {
              · {{ e.date().value() }}
            }
            @if (showInvalid()) {
              · <span class="expense__err">{{ e().errorSummary().length }} do poprawy</span>
            }
          </span>
        </span>
        <span class="expense__amount">{{ amountLabel() }}</span>
        <app-icon class="expense__chevron" [d]="icons.chevron" [size]="16" />
      </button>
      <div class="expense__actions">
        @if (confirming()) {
          <span class="confirm" role="group" aria-label="Potwierdź usunięcie">
            <span>Usunąć?</span>
            <button type="button" class="btn btn--danger btn--xs" (click)="remove.emit()">
              Tak
            </button>
            <button type="button" class="btn btn--ghost btn--xs" (click)="confirming.set(false)">
              Nie
            </button>
          </span>
        } @else {
          <button
            type="button"
            class="icon-btn"
            (click)="duplicate.emit()"
            [attr.aria-label]="'Duplikuj wydatek ' + (index() + 1)"
            title="Duplikuj"
          >
            <app-icon [d]="icons.copy" [size]="16" />
          </button>
          <button
            type="button"
            class="icon-btn icon-btn--danger"
            (click)="confirming.set(true)"
            [attr.aria-label]="'Usuń wydatek ' + (index() + 1)"
            title="Usuń"
          >
            <app-icon [d]="icons.trash" [size]="16" />
          </button>
        }
      </div>
    </div>

    @if (expanded()) {
      <div class="expense__body" [id]="bodyId()">
        <app-field [field]="e.category" label="Kategoria" [custom]="true">
          <!-- [SF] custom FormValueControl<Category> -->
          <app-category-picker [formField]="e.category" [ariaLabelledby]="categoryLabelId()" />
        </app-field>

        <div class="grid grid--3">
          <app-field [field]="e.date" label="Data">
            <input class="input" type="date" [formField]="e.date" />
          </app-field>

          <!-- [SF] hidden() — fields rendered only when not hidden -->
          @if (!e.amount().hidden()) {
            <app-field [field]="e.amount" label="Kwota" [showErrors]="false">
              <app-money-input [formField]="e.amount" [currency]="e.currency().value()" />
            </app-field>
          }
          @if (!e.currency().hidden()) {
            <app-field [field]="e.currency" label="Waluta">
              <select class="input select" [formField]="e.currency">
                @for (c of currencies; track c.value) {
                  <option [value]="c.value">{{ c.label }}</option>
                }
              </select>
            </app-field>
          }

          @if (!e.km().hidden()) {
            <app-field [field]="e.km" label="Kilometry">
              <input
                class="input input--num"
                type="number"
                inputmode="numeric"
                [formField]="e.km"
              />
            </app-field>
          }
          @if (!e.ratePerKm().hidden()) {
            <app-field [field]="e.ratePerKm" label="Stawka za km (PLN)">
              <!-- [SF] readonly() — FormField sets the readonly attribute -->
              <input class="input input--num" type="number" step="0.01" [formField]="e.ratePerKm" />
            </app-field>
          }
          @if (!e.nights().hidden()) {
            <app-field [field]="e.nights" label="Liczba nocy">
              <input
                class="input input--num"
                type="number"
                inputmode="numeric"
                [formField]="e.nights"
              />
            </app-field>
          }
          @if (!e.attendees().hidden()) {
            <app-field [field]="e.attendees" label="Liczba osób">
              <input
                class="input input--num"
                type="number"
                inputmode="numeric"
                [formField]="e.attendees"
              />
            </app-field>
          }
        </div>

        @if (e.category().value() === 'car') {
          <p class="calc-note">
            {{ e.km().value() || 0 }} km × {{ e.ratePerKm().value() }} zł =
            <strong class="num">{{ amountLabel() }}</strong>
            <span class="muted">(stawka przykładowa)</span>
          </p>
        }

        <div class="grid grid--2">
          <app-field [field]="e.description" label="Opis">
            <input class="input" type="text" [formField]="e.description" />
          </app-field>
          <app-field [field]="e.receiptNo" label="Nr paragonu / faktury">
            <input class="input input--mono" type="text" [formField]="e.receiptNo" />
          </app-field>
        </div>
      </div>
    }
  `,
})
export class ExpenseRowComponent {
  readonly item = input.required<FieldTree<Expense>>();
  readonly index = input.required<number>();
  readonly startOpen = input(false);
  readonly remove = output<void>();
  readonly duplicate = output<void>();

  protected readonly icons = ICONS;
  protected readonly currencies = CURRENCIES;
  protected readonly demo = inject(DemoMode);

  protected readonly open = signal<boolean | null>(null);
  protected readonly confirming = signal(false);

  protected readonly showInvalid = computed(() => {
    const s = this.item()();
    return s.touched() && s.invalid();
  });
  /** Rows with visible errors stay open so `focusBoundControl()` can reach their controls. */
  protected readonly expanded = computed(
    () => (this.open() ?? this.startOpen()) || this.showInvalid(),
  );

  protected readonly info = computed(() => categoryInfo(this.item().category().value()));
  protected readonly bodyId = computed(() => `expense-${this.item()().value().id}`);
  protected readonly categoryLabelId = computed(() => labelId(this.item().category().name()));
  protected readonly amountLabel = computed(() => {
    const e = this.item()().value();
    const currency = e.category === 'car' ? 'PLN' : e.currency;
    return `${formatMoney(expenseAmount(e) || 0)} ${currency}`;
  });
}
