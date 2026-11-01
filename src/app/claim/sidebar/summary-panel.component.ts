import { Component, computed, input } from '@angular/core';
import { claimTotal, formatMoney, round2, totalsByCategory } from '../claim.calc';
import { CATEGORIES, EUR_RATE } from '../claim.config';
import type { ExpenseClaim } from '../claim.model';

@Component({
  selector: 'app-summary-panel',
  host: { class: 'card panel' },
  template: `
    <h2 class="panel__title">Podsumowanie</h2>
    <p class="panel__sub">{{ countLabel() }}</p>

    @if (bars().length) {
      <ul class="bars" aria-label="Suma według kategorii">
        @for (b of bars(); track b.label) {
          <li class="bars__row">
            <span class="bars__label">{{ b.label }}</span>
            <span class="bars__track" aria-hidden="true"
              ><span class="bars__fill" [style.width.%]="b.pct"></span
            ></span>
            <span class="bars__value num">{{ b.value }}</span>
          </li>
        }
      </ul>
    }

    <div class="total">
      <span class="total__label">Suma wydatków</span>
      <span class="total__value num">{{ fmt(total()) }} <small>PLN</small></span>
    </div>

    <dl class="kv">
      <div>
        <dt>Zaliczka</dt>
        <dd class="num">− {{ fmt(advance()) }} PLN</dd>
      </div>
      <div class="kv__strong">
        <dt>{{ balance() >= 0 ? 'Do wypłaty' : 'Do zwrotu' }}</dt>
        <dd class="num" [class.text-warning]="balance() < 0">{{ fmt(abs(balance())) }} PLN</dd>
      </div>
    </dl>
    <p class="panel__foot">EUR przeliczane po kursie poglądowym {{ eurRate }} PLN.</p>
  `,
})
export class SummaryPanelComponent {
  readonly claim = input.required<ExpenseClaim>();

  protected readonly eurRate = EUR_RATE.toFixed(2).replace('.', ',');
  protected readonly fmt = formatMoney;
  protected readonly abs = Math.abs;

  protected readonly total = computed(() => claimTotal(this.claim()));
  protected readonly advance = computed(() => {
    const p = this.claim().payout;
    return p.hadAdvance ? p.advance || 0 : 0;
  });
  protected readonly balance = computed(() => round2(this.total() - this.advance()));

  protected readonly countLabel = computed(() => {
    const n = this.claim().expenses.length;
    if (n === 0) return 'Brak wydatków';
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20);
    return `${n} ${n === 1 ? 'wydatek' : few ? 'wydatki' : 'wydatków'}`;
  });

  protected readonly bars = computed(() => {
    const sums = totalsByCategory(this.claim().expenses);
    const maxValue = Math.max(0, ...sums.values());
    return CATEGORIES.filter((c) => sums.has(c.value)).map((c) => {
      const v = sums.get(c.value) ?? 0;
      return {
        label: c.label,
        value: formatMoney(v),
        pct: maxValue ? Math.max(2, (v / maxValue) * 100) : 0,
      };
    });
  });
}
