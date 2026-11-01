import { Component, computed, inject, input } from '@angular/core';
import type { ReadonlyFieldTree } from '@angular/forms/signals';
import { API_BADGE, HELP_TEXT } from '../../claim/claim.metadata';
import { DemoMode } from '../../core/demo-mode.service';
import { FieldErrorsComponent } from './field-errors.component';
import { errorsId, fieldId, hintId, labelId } from './field-ids';

/**
 * Field wrapper: label (+ required mark), projected control, help text from `HELP_TEXT`,
 * errors and — in demo mode — `API_BADGE` chips. Reads all state from the given field.
 */
@Component({
  selector: 'app-field',
  imports: [FieldErrorsComponent],
  host: { class: 'field', '[class.field--disabled]': 'state().disabled()' },
  template: `
    <div class="field__head">
      @if (!label()) {
        <span></span>
      } @else if (custom()) {
        <span class="field__label" [id]="ids().label">
          {{ label() }}
          @if (state().required()) {
            <span class="field__req" aria-hidden="true">*</span>
            <span class="sr-only">(wymagane)</span>
          }
        </span>
      } @else {
        <label class="field__label" [id]="ids().label" [attr.for]="ids().control">
          {{ label() }}
          @if (state().required()) {
            <span class="field__req" aria-hidden="true">*</span>
            <span class="sr-only">(wymagane)</span>
          }
        </label>
      }
      @if (demo.showApi()) {
        <span class="field__badges">
          @for (b of badges(); track b) {
            <code class="api-badge">{{ b }}</code>
          }
        </span>
      }
    </div>
    <ng-content />
    @if (help()) {
      <p class="field__hint" [id]="ids().hint">{{ help() }}</p>
    }
    @if (showErrors()) {
      <app-field-errors
        [errorId]="ids().errors"
        [errors]="state().errors()"
        [show]="state().touched()"
        [disabledReasons]="state().disabledReasons()"
      />
    }
  `,
})
export class FieldComponent {
  readonly field = input.required<ReadonlyFieldTree<unknown>>();
  readonly label = input.required<string>();
  /** Custom controls render their own errors and are labelled via `aria-labelledby`. */
  readonly custom = input(false);
  readonly showErrors = input(true);

  protected readonly demo = inject(DemoMode);
  protected readonly state = computed(() => this.field()());
  protected readonly help = computed(() => this.state().metadata(HELP_TEXT)?.());
  protected readonly badges = computed(() => this.state().metadata(API_BADGE)?.() ?? []);
  protected readonly ids = computed(() => {
    const name = this.state().name();
    return {
      control: fieldId(name),
      label: labelId(name),
      hint: hintId(name),
      errors: errorsId(name),
    };
  });
}
