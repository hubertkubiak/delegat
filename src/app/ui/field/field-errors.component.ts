import { Component, input } from '@angular/core';
import type { DisabledReason, ValidationError } from '@angular/forms/signals';
import { ICONS, IconComponent } from '../icon/icon.component';

/** Renders validation errors (once touched) and disabled reasons (always, muted with a lock). */
@Component({
  selector: 'app-field-errors',
  imports: [IconComponent],
  host: { class: 'field-errors', '[attr.id]': 'errorId() || null', 'aria-live': 'polite' },
  template: `
    @if (show()) {
      @for (e of errors(); track $index) {
        <p class="field-errors__error">
          <app-icon [d]="icons.alert" [size]="14" />
          <span>{{ e.message || e.kind }}</span>
        </p>
      }
    }
    @for (r of disabledReasons(); track $index) {
      @if (r.message) {
        <p class="field-errors__reason">
          <app-icon [d]="icons.lock" [size]="14" />
          <span>{{ r.message }}</span>
        </p>
      }
    }
  `,
})
export class FieldErrorsComponent {
  readonly errors = input<readonly ValidationError[]>([]);
  readonly disabledReasons = input<readonly Pick<DisabledReason, 'message'>[]>([]);
  readonly show = input(false);
  readonly errorId = input('');

  protected readonly icons = ICONS;
}
