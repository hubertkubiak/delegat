import { JsonPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';
import type { ClaimForm } from '../claim-form';

@Component({
  selector: 'app-form-inspector',
  imports: [JsonPipe],
  host: { class: 'card panel' },
  template: `
    @let s = f()();
    <h2 class="panel__title">Stan formularza</h2>
    <!-- [SF] valid() / pending() / dirty() / touched() / submitting() -->
    <ul class="pills" aria-label="Flagi stanu">
      @for (p of pills(); track p.name) {
        <li class="pill" [class.pill--on]="p.on">
          <span class="pill__dot" aria-hidden="true"></span>{{ p.name }}
          <span class="sr-only">{{ p.on ? 'tak' : 'nie' }}</span>
        </li>
      }
    </ul>

    <h3 class="panel__h3">
      Błędy <span class="muted num">({{ s.errorSummary().length }})</span>
    </h3>
    <!-- [SF] errorSummary() — click to focusBoundControl() -->
    @if (s.errorSummary().length) {
      <ol class="errlist">
        @for (e of s.errorSummary(); track $index) {
          <li>
            <button type="button" class="errlist__btn" (click)="focusError.emit(e)">
              <span class="errlist__path">{{ pathOf(e) }}</span>
              <span class="errlist__msg">{{ e.message || e.kind }}</span>
            </button>
          </li>
        }
      </ol>
    } @else {
      <p class="muted small">Brak błędów walidacji.</p>
    }

    <details class="json">
      <summary>Podgląd <code>model()</code></summary>
      <pre>{{ s.value() | json }}</pre>
    </details>
  `,
})
export class FormInspectorComponent {
  readonly f = input.required<ClaimForm>();
  readonly focusError = output<ValidationError.WithFieldTree>();

  protected readonly pills = computed(() => {
    const s = this.f()();
    return [
      { name: 'valid', on: s.valid() },
      { name: 'pending', on: s.pending() },
      { name: 'dirty', on: s.dirty() },
      { name: 'touched', on: s.touched() },
      { name: 'submitting', on: s.submitting() },
    ];
  });

  protected pathOf(e: ValidationError.WithFieldTree): string {
    return (
      e
        .fieldTree()
        .name()
        .replace(/^claim\.?/, '') || 'formularz'
    );
  }
}
