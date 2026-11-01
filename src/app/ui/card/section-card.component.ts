import { Component, computed, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { ICONS, IconComponent } from '../icon/icon.component';

/** Numbered form section with live status and a "check section" action. */
@Component({
  selector: 'app-section-card',
  imports: [IconComponent],
  host: { class: 'card section', role: 'group', '[attr.aria-labelledby]': 'headingId()' },
  template: `
    <header class="section__head">
      <span class="section__num" aria-hidden="true">{{ index() }}</span>
      <h2 class="section__title" [id]="headingId()">{{ title() }}</h2>
      <span class="section__status" aria-live="polite">
        @if (valid()) {
          <span class="status status--ok"><app-icon [d]="icons.check" [size]="14" /> Gotowe</span>
        } @else if (pending()) {
          <span class="status status--pending"
            ><span class="spinner" aria-hidden="true"></span> Sprawdzam…</span
          >
        } @else if (touched() && errorCount() > 0) {
          <span class="status status--error">{{ errorLabel() }}</span>
        }
      </span>
      <button type="button" class="link-btn section__check" (click)="check()">
        Sprawdź sekcję
      </button>
    </header>
    <ng-content select="[sectionExtra]" />
    <div class="section__body">
      <ng-content />
    </div>
  `,
})
export class SectionCardComponent {
  readonly index = input.required<number>();
  readonly title = input.required<string>();
  /** Nodes whose state this card summarises (a section may span several root fields). */
  readonly nodes = input.required<readonly FieldTree<unknown>[]>();

  protected readonly icons = ICONS;
  protected readonly headingId = computed(() => `section-${this.index()}`);

  // [SF] valid() / pending() / touched() aggregated over the section's nodes
  protected readonly valid = computed(() => this.nodes().every((n) => n().valid()));
  protected readonly pending = computed(() => this.nodes().some((n) => n().pending()));
  protected readonly touched = computed(() => this.nodes().some((n) => n().touched()));
  // [SF] errorSummary — errors of each node and all its descendants
  protected readonly errorCount = computed(() =>
    this.nodes().reduce((sum, n) => sum + n().errorSummary().length, 0),
  );
  protected readonly errorLabel = computed(() => {
    const n = this.errorCount();
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20);
    return `${n} ${n === 1 ? 'błąd' : few ? 'błędy' : 'błędów'}`;
  });

  protected check(): void {
    // [SF] markAsTouched — reveal every error in this section
    for (const n of this.nodes()) n().markAsTouched();
  }
}
