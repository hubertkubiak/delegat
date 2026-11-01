import { Component, type ElementRef, input, model, output, viewChild } from '@angular/core';
import type { FormCheckboxControl, ValidationError } from '@angular/forms/signals';

// [SF] FormCheckboxControl — `checked` model, deliberately no `value`
@Component({
  selector: 'app-switch',
  host: {
    class: 'switch',
    '[class.switch--disabled]': 'disabled()',
    '[class.is-invalid]': 'touched() && invalid()',
  },
  template: `
    <button
      #btn
      type="button"
      role="switch"
      class="switch__control"
      [attr.aria-checked]="checked()"
      [attr.aria-required]="required() || null"
      [attr.aria-invalid]="(touched() && invalid()) || null"
      [attr.aria-describedby]="describedBy() || null"
      [attr.name]="name() || null"
      [disabled]="disabled()"
      (click)="toggle()"
      (blur)="touch.emit()"
    >
      <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
      <span class="switch__label"><ng-content /></span>
    </button>
  `,
})
export class SwitchComponent implements FormCheckboxControl {
  readonly checked = model(false);

  // [SF] optional control inputs
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly touched = input(false);
  readonly invalid = input(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input('');
  readonly touch = output<void>();

  readonly describedBy = input('');

  private readonly btn = viewChild.required<ElementRef<HTMLButtonElement>>('btn');

  protected toggle(): void {
    if (this.readonly()) return;
    this.checked.update((c) => !c);
  }

  focus(options?: FocusOptions): void {
    this.btn().nativeElement.focus(options);
  }
}
