import { httpResource } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { FormRoot, submit, type ValidationError } from '@angular/forms/signals';
import type { DepartmentFieldConfig } from '../core/cost-center.types';
import { DemoMode } from '../core/demo-mode.service';
import { DraftStorage, type StoredDraft } from '../core/draft-storage.service';
import { ToastService } from '../ui/toast/toast';
import { buildClaimForm, type ClaimForm } from './claim-form';
import { emptyClaim, type ExpenseClaim, type ExtraField, sampleClaim } from './claim.model';
import { ApprovalSectionComponent } from './sections/approval-section.component';
import { EmployeeSectionComponent } from './sections/employee-section.component';
import { ExpensesSectionComponent } from './sections/expenses-section.component';
import { ExtrasSectionComponent } from './sections/extras-section.component';
import { PayoutSectionComponent } from './sections/payout-section.component';
import { TripSectionComponent } from './sections/trip-section.component';
import { FormInspectorComponent } from './sidebar/form-inspector.component';
import { SummaryPanelComponent } from './sidebar/summary-panel.component';
import { SuccessCardComponent } from './success/success-card.component';

const dateFormat = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });

@Component({
  selector: 'app-claim-page',
  imports: [
    FormRoot,
    EmployeeSectionComponent,
    TripSectionComponent,
    ExpensesSectionComponent,
    ExtrasSectionComponent,
    PayoutSectionComponent,
    ApprovalSectionComponent,
    SummaryPanelComponent,
    FormInspectorComponent,
    SuccessCardComponent,
  ],
  host: { class: 'page' },
  template: `
    @if (submitted(); as done) {
      <div class="page__success">
        <app-success-card [claimId]="done.id" [claim]="done.claim" (restart)="restart()" />
      </div>
    } @else {
      <div class="page__main">
        @if (draftOffer(); as d) {
          <div class="banner" role="region" aria-label="Zapisany szkic">
            <p>
              Masz zapisany szkic z <strong>{{ formatDate(d.savedAt) }}</strong
              >.
            </p>
            <div class="banner__actions">
              <button type="button" class="btn btn--primary btn--sm" (click)="loadDraft(d)">
                Wczytaj
              </button>
              <button type="button" class="btn btn--ghost btn--sm" (click)="discardDraft()">
                Odrzuć
              </button>
            </div>
          </div>
        }

        <div class="page__intro">
          <p>Uzupełnij sześć sekcji i wyślij wniosek do akceptacji.</p>
          <button type="button" class="link-btn" (click)="fillSample()">
            Wypełnij przykładowymi danymi
          </button>
        </div>

        <!-- [SF] FormRoot — novalidate + submit() with the form's submission options -->
        <form class="claim" [formRoot]="claimForm" aria-label="Rozliczenie delegacji">
          <app-employee-section [f]="claimForm" />
          <app-trip-section [f]="claimForm" [(strictPolicy)]="strictPolicy" />
          <app-expenses-section [f]="claimForm" [model]="model" />
          <app-extras-section
            [f]="claimForm"
            [department]="department()"
            [loading]="departmentFields.isLoading()"
          />
          <app-payout-section [f]="claimForm" />
          <app-approval-section [f]="claimForm" />

          @for (e of claimForm().errors(); track $index) {
            <p class="banner banner--danger" role="alert">{{ e.message }}</p>
          }

          <div class="actions">
            <!-- [SF] submitting() -->
            <button type="submit" class="btn btn--primary" [disabled]="busy()">
              @if (busy()) {
                <span class="spinner spinner--light" aria-hidden="true"></span>
                {{ awaitingValidation() ? 'Czekam na walidację…' : 'Wysyłanie…' }}
              } @else {
                Wyślij do akceptacji
              }
            </button>
            <button type="button" class="btn btn--secondary" (click)="saveDraft()">
              Zapisz szkic
            </button>
            <span class="actions__spacer"></span>
            @if (confirmClear()) {
              <span class="confirm" role="group" aria-label="Potwierdź wyczyszczenie">
                <span>Wyczyścić formularz?</span>
                <button type="button" class="btn btn--danger btn--xs" (click)="clear()">Tak</button>
                <button
                  type="button"
                  class="btn btn--ghost btn--xs"
                  (click)="confirmClear.set(false)"
                >
                  Nie
                </button>
              </span>
            } @else {
              <button type="button" class="link-btn" (click)="confirmClear.set(true)">
                Wyczyść
              </button>
            }
          </div>
        </form>
      </div>

      <aside class="page__side" aria-label="Podsumowanie i stan formularza">
        <app-summary-panel [claim]="model()" />
        <app-form-inspector [f]="claimForm" (focusError)="focusError($event)" />
      </aside>
    }
  `,
})
export class ClaimPageComponent {
  private readonly injector = inject(Injector);
  private readonly drafts = inject(DraftStorage);
  private readonly toasts = inject(ToastService);
  private readonly demo = inject(DemoMode);

  readonly model = signal<ExpenseClaim>(emptyClaim());
  readonly strictPolicy = signal(false);
  protected readonly awaitingValidation = signal(false);
  protected readonly confirmClear = signal(false);
  protected readonly submitted = signal<{ id: string; claim: ExpenseClaim } | null>(null);
  protected readonly draftOffer = signal<StoredDraft | null>(this.drafts.load());

  readonly claimForm: ClaimForm = buildClaimForm(this.model, {
    strictPolicy: this.strictPolicy,
    awaitingValidation: this.awaitingValidation,
    onSubmitted: (id) => {
      this.submitted.set({ id, claim: this.model() });
      this.drafts.clear();
      this.draftOffer.set(null);
      afterNextRender(() => document.querySelector<HTMLElement>('.success__title')?.focus(), {
        injector: this.injector,
      });
    },
    onInvalid: (f) => this.focusFirstError(f),
  });

  protected readonly busy = computed(
    () => this.claimForm().submitting() || this.awaitingValidation(),
  );
  protected readonly department = computed(() => this.claimForm.employee.department().value());

  // [SF] httpResource — department config drives which dynamic fields exist
  protected readonly departmentFields = httpResource<DepartmentFieldConfig[]>(() => {
    const code = this.department();
    return code ? `/api/departments/${code}/fields` : undefined;
  });

  constructor() {
    // Native <input type="date"> controls report a value on first render, which marks them dirty.
    // Start from a pristine form: reset() without a value clears touched/dirty only.
    afterNextRender(() => {
      // `?demo` opens the app pre-filled (handy for screenshots and shared links), `&api` adds badges.
      const params = new URLSearchParams(location.search);
      if (params.has('demo')) {
        this.resetTo(sampleClaim());
        this.draftOffer.set(null);
        if (params.has('api')) this.demo.showApi.set(true);
      } else {
        this.claimForm().reset();
      }
    });

    // [SF] dynamic controls — department config → model.update() → new field trees
    effect(() => {
      const code = this.department();
      const res = this.departmentFields;
      if (code && res.status() !== 'resolved') return;
      const config = code && res.hasValue() ? res.value() : [];
      untracked(() => {
        const extras = mergeExtras(config, this.model().extras);
        if (JSON.stringify(extras) === JSON.stringify(this.model().extras)) return;
        this.model.update((m) => ({ ...m, extras }));
      });
    });

    // Leaving the "abroad" mode resets foreign currencies (the select becomes disabled).
    effect(() => {
      if (this.claimForm.trip.abroad().value()) return;
      untracked(() => {
        if (!this.model().expenses.some((e) => e.currency === 'EUR')) return;
        this.model.update((m) => ({
          ...m,
          expenses: m.expenses.map((e) => ({ ...e, currency: 'PLN' as const })),
        }));
      });
    });
  }

  protected async saveDraft(): Promise<void> {
    // [SF] submit(form, { ignoreValidators: 'all', action }) — saves even an invalid form
    await submit(this.claimForm, {
      ignoreValidators: 'all',
      action: async (f) => {
        this.drafts.save(f().value());
        this.draftOffer.set(null);
        this.toasts.show('Szkic zapisany');
        return undefined;
      },
    });
  }

  protected loadDraft(draft: StoredDraft): void {
    this.model.set(draft.claim);
    this.draftOffer.set(null);
    this.toasts.show('Wczytano szkic', 'info');
  }

  protected discardDraft(): void {
    this.drafts.clear();
    this.draftOffer.set(null);
  }

  protected fillSample(): void {
    this.resetTo(sampleClaim());
    this.toasts.show('Wstawiono przykładowe dane', 'info');
  }

  protected clear(): void {
    this.resetTo(emptyClaim());
    this.confirmClear.set(false);
  }

  protected restart(): void {
    this.resetTo(emptyClaim());
    this.submitted.set(null);
  }

  private resetTo(value: ExpenseClaim): void {
    // [SF] reset(value) — new value, pristine & untouched
    this.claimForm().reset(value);
    // Date inputs re-report their new value after rendering; clear the flags once more.
    afterNextRender(() => this.claimForm().reset(), { injector: this.injector });
  }

  protected focusError(error: ValidationError.WithFieldTree): void {
    const state = error.fieldTree();
    if (state.formFieldBindings().length > 0) {
      state.focusBoundControl();
      return;
    }
    // Not rendered — it lives in a collapsed expense row. Touching the list expands invalid rows.
    this.claimForm.expenses().markAsTouched();
    afterNextRender(() => state.focusBoundControl(), { injector: this.injector });
  }

  private focusFirstError(f: ClaimForm): void {
    afterNextRender(
      () => {
        // [SF] errorSummary() + focusBoundControl() — jump to the first invalid control
        const first = f().errorSummary()[0];
        first?.fieldTree().focusBoundControl();
      },
      { injector: this.injector },
    );
  }

  protected formatDate(iso: string): string {
    return dateFormat.format(new Date(iso));
  }
}

function mergeExtras(
  config: readonly DepartmentFieldConfig[],
  current: readonly ExtraField[],
): ExtraField[] {
  return config.map((c) => ({ ...c, value: current.find((x) => x.key === c.key)?.value ?? '' }));
}
