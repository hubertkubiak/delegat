import { FormField } from '@angular/forms/signals';
import { FieldA11yDirective } from './field-a11y.directive';
import { FieldComponent } from './field.component';

export { FieldA11yDirective } from './field-a11y.directive';
export { FieldComponent } from './field.component';
export { FieldErrorsComponent } from './field-errors.component';
export * from './field-ids';

/** Everything a section template needs to render bound fields. */
export const FIELD_IMPORTS = [FormField, FieldComponent, FieldA11yDirective] as const;
