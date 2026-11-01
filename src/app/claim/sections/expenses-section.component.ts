import {
  afterNextRender,
  Component,
  inject,
  Injector,
  input,
  signal,
  type WritableSignal,
} from '@angular/core';
import { DemoMode } from '../../core/demo-mode.service';
import { SectionCardComponent } from '../../ui/card/section-card.component';
import { FieldErrorsComponent } from '../../ui/field';
import { ICONS, IconComponent } from '../../ui/icon/icon.component';
import type { ClaimForm } from '../claim-form';
import { type ExpenseClaim, newExpense } from '../claim.model';
import { ExpenseRowComponent } from './expense-row.component';

@Component({
  selector: 'app-expenses-section',
  imports: [SectionCardComponent, ExpenseRowComponent, FieldErrorsComponent, IconComponent],
  template: `
    @let list = f().expenses;
    <app-section-card [index]="3" title="Wydatki" [nodes]="[list]">
      @if (demo.showApi()) {
        <p class="badges-row">
          <code class="api-badge">applyEach</code>
          <code class="api-badge">applyWhen</code>
          <code class="api-badge">minLength(array)</code>
          <code class="api-badge">model.update()</code>
        </p>
      }

      <div class="expenses">
        <!-- [SF] dynamic controls — rows tracked by the id stored in the model -->
        @for (item of list; track item().value().id; let i = $index) {
          <app-expense-row
            [item]="item"
            [index]="i"
            [startOpen]="newIds().has(item().value().id)"
            (remove)="remove(item().value().id)"
            (duplicate)="duplicate(item().value().id)"
          />
        } @empty {
          <p class="empty">Brak wydatków. Dodaj bilet, nocleg, posiłek lub przejazd autem.</p>
        }
      </div>

      <app-field-errors
        [errors]="list().errors()"
        [show]="list().touched()"
        errorId="expenses-errors"
      />

      <button type="button" class="btn btn--dashed" (click)="add()">
        <app-icon [d]="icons.plus" [size]="16" /> Dodaj wydatek
      </button>
    </app-section-card>
  `,
})
export class ExpensesSectionComponent {
  readonly f = input.required<ClaimForm>();
  readonly model = input.required<WritableSignal<ExpenseClaim>>();

  protected readonly icons = ICONS;
  protected readonly demo = inject(DemoMode);
  protected readonly newIds = signal<ReadonlySet<string>>(new Set());
  private readonly injector = inject(Injector);

  protected add(): void {
    const expense = newExpense();
    this.newIds.update((s) => new Set(s).add(expense.id));
    // [SF] model.update() — adding an item creates its field tree automatically
    this.model().update((m) => ({ ...m, expenses: [...m.expenses, expense] }));
    afterNextRender(
      () => {
        const list = this.f().expenses;
        list[list.length - 1]?.category().focusBoundControl();
      },
      { injector: this.injector },
    );
  }

  protected remove(id: string): void {
    // [SF] model.update() — removing an item drops its fields and validators
    this.model().update((m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== id) }));
    this.f().expenses().markAsTouched({ skipDescendants: true });
  }

  protected duplicate(id: string): void {
    this.model().update((m) => {
      const i = m.expenses.findIndex((e) => e.id === id);
      if (i < 0) return m;
      const copy = { ...m.expenses[i], id: crypto.randomUUID() };
      this.newIds.update((s) => new Set(s).add(copy.id));
      const expenses = [...m.expenses];
      expenses.splice(i + 1, 0, copy);
      return { ...m, expenses };
    });
  }
}
