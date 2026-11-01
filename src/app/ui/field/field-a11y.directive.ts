import { computed, Directive, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { HELP_TEXT } from '../../claim/claim.metadata';
import { errorsId, fieldId, hintId } from './field-ids';

/**
 * Adds `id`, `aria-invalid` and `aria-describedby` to native controls bound with `[formField]`,
 * so labels, hints and error messages rendered by `FieldComponent` are wired up automatically.
 * Custom controls handle ARIA themselves; radio buttons share a field and get no id.
 */
@Directive({
  // Deliberately un-prefixed: it attaches to every native control bound with [formField].
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'input[formField], select[formField], textarea[formField]',
  host: {
    '[attr.id]': 'id()',
    '[attr.aria-invalid]': 'invalid()',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class FieldA11yDirective {
  private readonly formField = inject(FormField);
  private readonly isRadio = (this.formField.element as HTMLInputElement).type === 'radio';

  private readonly name = computed(() => this.formField.state().name());
  protected readonly id = computed(() => (this.isRadio ? null : fieldId(this.name())));
  protected readonly invalid = computed(() => {
    const s = this.formField.state();
    return s.touched() && s.invalid() ? 'true' : null;
  });
  protected readonly describedBy = computed(() => {
    if (this.isRadio) return null;
    const hasHint = !!this.formField.state().metadata(HELP_TEXT)?.();
    return [errorsId(this.name()), hasHint ? hintId(this.name()) : ''].filter(Boolean).join(' ');
  });
}
