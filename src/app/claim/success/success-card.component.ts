import { Component, computed, input, output } from '@angular/core';
import { claimTotal, formatMoney } from '../claim.calc';
import type { ExpenseClaim } from '../claim.model';

@Component({
  selector: 'app-success-card',
  host: { class: 'card success' },
  template: `
    <svg class="success__art" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="44" fill="var(--success-soft)" />
      <circle cx="48" cy="48" r="30" fill="none" stroke="var(--success)" stroke-width="3" />
      <path
        d="M35 49l9 9 18-20"
        fill="none"
        stroke="var(--success)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <h2 class="success__title" tabindex="-1">Wniosek wysłany do akceptacji</h2>
    <p class="success__id">
      Numer wniosku: <strong class="mono">{{ claimId() }}</strong>
    </p>
    <dl class="kv success__kv">
      <div>
        <dt>Pracownik</dt>
        <dd>{{ claim().employee.fullName }}</dd>
      </div>
      <div>
        <dt>Cel</dt>
        <dd>{{ claim().trip.purpose }}</dd>
      </div>
      <div>
        <dt>Termin</dt>
        <dd>{{ claim().trip.startDate }} – {{ claim().trip.endDate }}</dd>
      </div>
      <div>
        <dt>Wydatki</dt>
        <dd>{{ claim().expenses.length }}</dd>
      </div>
      <div class="kv__strong">
        <dt>Suma</dt>
        <dd class="num">{{ total() }} PLN</dd>
      </div>
      <div>
        <dt>Akceptujący</dt>
        <dd>{{ claim().approverEmail }}</dd>
      </div>
    </dl>
    <button type="button" class="btn btn--primary" (click)="restart.emit()">
      Nowe rozliczenie
    </button>
  `,
})
export class SuccessCardComponent {
  readonly claimId = input.required<string>();
  readonly claim = input.required<ExpenseClaim>();
  readonly restart = output<void>();

  protected readonly total = computed(() => formatMoney(claimTotal(this.claim())));
}
