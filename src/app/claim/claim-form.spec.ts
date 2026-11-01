import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { buildClaimForm } from './claim-form';
import { emptyClaim, type Expense, type ExpenseClaim, newExpense } from './claim.model';

function setup(patch: (c: ExpenseClaim) => ExpenseClaim = (c) => c) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const model = signal(patch(emptyClaim()));
  const strictPolicy = signal(false);
  const f = TestBed.runInInjectionContext(() => buildClaimForm(model, { strictPolicy }));
  return { model, strictPolicy, f };
}

const withExpense = (e: Partial<Expense>) => (c: ExpenseClaim) => ({
  ...c,
  expenses: [{ ...newExpense(), ...e }],
});

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);

describe('buildClaimForm', () => {
  it('reports an error when endDate is before startDate', () => {
    const { f } = setup((c) => ({
      ...c,
      trip: { ...c.trip, startDate: '2026-05-10', endDate: '2026-05-08' },
    }));
    expect(kinds(f.trip.endDate().errors())).toContain('date-order');

    f.trip.endDate().value.set('2026-05-12');
    expect(kinds(f.trip.endDate().errors())).not.toContain('date-order');
  });

  it('requires a receipt number only when amount > 100', () => {
    const { f } = setup(withExpense({ amount: 150 }));
    const receipt = f.expenses[0].receiptNo;
    expect(receipt().required()).toBe(true);
    expect(kinds(receipt().errors())).toContain('required');

    f.expenses[0].amount().value.set(100);
    expect(receipt().required()).toBe(false);
    expect(receipt().errors()).toEqual([]);
  });

  it('switches the Zod schema when strictPolicy changes', () => {
    const { f, strictPolicy } = setup((c) => ({
      ...c,
      trip: {
        ...c.trip,
        purpose: 'Szkolenie z Angulara',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
      },
    }));
    expect(f.trip.purpose().errors()).toEqual([]);

    strictPolicy.set(true);
    expect(f.trip.purpose().errors().length).toBe(1);
    expect(f.trip.purpose().errors()[0].message).toContain('30');

    strictPolicy.set(false);
    expect(f.trip.purpose().errors()).toEqual([]);
  });

  it('attaches the validateTree error to payout.advance', () => {
    const { f } = setup((c) => ({
      ...withExpense({ amount: 80 })(c),
      payout: { ...c.payout, hadAdvance: true, advance: 500 },
    }));
    expect(kinds(f.payout.advance().errors())).toContain('advance-too-high');
    expect(kinds(f().errors())).not.toContain('advance-too-high');

    f.payout.advance().value.set(50);
    expect(kinds(f.payout.advance().errors())).not.toContain('advance-too-high');
  });

  it('disables the advance with a reason when no advance was taken', () => {
    const { f } = setup();
    expect(f.payout.advance().disabled()).toBe(true);
    expect(f.payout.advance().disabledReasons()[0].message).toContain('zaliczkę');
  });

  it('hides km for a meal and shows it for a car', () => {
    const { f } = setup(withExpense({ category: 'meal' }));
    expect(f.expenses[0].km().hidden()).toBe(true);
    expect(f.expenses[0].attendees().hidden()).toBe(false);

    f.expenses[0].category().value.set('car');
    expect(f.expenses[0].km().hidden()).toBe(false);
    expect(f.expenses[0].amount().hidden()).toBe(true);
    expect(f.expenses[0].ratePerKm().readonly()).toBe(true);
  });

  it('requires at least one expense', () => {
    const { f, model } = setup();
    expect(kinds(f.expenses().errors())).toContain('minLength');

    model.update((m) => ({ ...m, expenses: [newExpense()] }));
    expect(kinds(f.expenses().errors())).not.toContain('minLength');
  });

  it('flags an expense dated outside the trip', () => {
    const { f } = setup((c) => ({
      ...withExpense({ date: '2026-06-01' })(c),
      trip: { ...c.trip, startDate: '2026-05-01', endDate: '2026-05-03' },
    }));
    expect(kinds(f.expenses[0].date().errors())).toContain('out-of-trip');
  });

  it('rejects the employee as their own approver', () => {
    const { f } = setup((c) => ({
      ...c,
      employee: { ...c.employee, email: 'a@firma.pl' },
      approverEmail: 'A@firma.pl',
    }));
    expect(kinds(f.approverEmail().errors())).toContain('self-approval');
  });

  describe('validateHttp (cost center)', () => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    it('is pending while the request is in flight, then valid', async () => {
      const { f } = setup();
      const http = TestBed.inject(HttpTestingController);

      f.employee.costCenter().value.set('MPK-1001');
      TestBed.tick();
      await wait(450);
      TestBed.tick();

      const req = http.expectOne('/api/cost-centers/MPK-1001');
      expect(f.employee.costCenter().pending()).toBe(true);
      expect(f.employee.costCenter().valid()).toBe(false);

      req.flush({ active: true, name: 'Sprzedaż Północ' });
      await TestBed.inject(ApplicationRef).whenStable();
      expect(f.employee.costCenter().pending()).toBe(false);
      expect(f.employee.costCenter().valid()).toBe(true);
    });

    it('maps an inactive cost center and a 404 to errors', async () => {
      const { f } = setup();
      const http = TestBed.inject(HttpTestingController);

      f.employee.costCenter().value.set('MPK-9999');
      TestBed.tick();
      await wait(450);
      TestBed.tick();
      http
        .expectOne('/api/cost-centers/MPK-9999')
        .flush({ active: false, name: 'Projekt zamknięty' });
      await TestBed.inject(ApplicationRef).whenStable();
      expect(kinds(f.employee.costCenter().errors())).toEqual(['inactive']);

      f.employee.costCenter().value.set('MPK-4242');
      TestBed.tick();
      await wait(450);
      TestBed.tick();
      http
        .expectOne('/api/cost-centers/MPK-4242')
        .flush(null, { status: 404, statusText: 'Not Found' });
      await TestBed.inject(ApplicationRef).whenStable();
      expect(kinds(f.employee.costCenter().errors())).toEqual(['not-found']);
    });

    it('does not call the API when the pattern does not match', async () => {
      const { f } = setup();
      const http = TestBed.inject(HttpTestingController);
      f.employee.costCenter().value.set('MPK-12');
      TestBed.tick();
      await wait(450);
      TestBed.tick();
      http.expectNone(() => true);
      expect(kinds(f.employee.costCenter().errors())).toEqual(['pattern']);
    });
  });
});
