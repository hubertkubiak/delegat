import {
  Component,
  computed,
  type ElementRef,
  input,
  model,
  output,
  viewChildren,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { CATEGORIES } from '../../claim/claim.config';
import type { Category } from '../../claim/claim.model';
import { IconComponent } from '../icon/icon.component';

// [SF] FormValueControl<Category> — tile radiogroup with roving tabindex
@Component({
  selector: 'app-category-picker',
  imports: [IconComponent],
  host: {
    class: 'cat-picker',
    role: 'radiogroup',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.aria-readonly]': 'readonly() || null',
    '[attr.aria-invalid]': '(touched() && invalid()) || null',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @for (c of categories; track c.value; let i = $index) {
      <button
        #tile
        type="button"
        role="radio"
        class="cat-tile"
        [class.cat-tile--active]="c.value === value()"
        [attr.aria-checked]="c.value === value()"
        [attr.tabindex]="i === activeIndex() ? 0 : -1"
        [attr.aria-disabled]="disabled() || readonly() || null"
        (click)="select(c.value)"
        (keydown)="onKeydown($event, i)"
      >
        <app-icon [d]="c.icon" [size]="22" />
        <span class="cat-tile__label">{{ c.label }}</span>
      </button>
    }
  `,
})
export class CategoryPickerComponent implements FormValueControl<Category> {
  readonly value = model<Category>('transport');

  // [SF] optional control inputs
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly touched = input(false);
  readonly invalid = input(false);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly required = input(false);
  readonly touch = output<void>();

  readonly ariaLabelledby = input('');

  protected readonly categories = CATEGORIES;
  private readonly tiles = viewChildren<ElementRef<HTMLButtonElement>>('tile');

  protected readonly activeIndex = computed(() =>
    Math.max(
      0,
      this.categories.findIndex((c) => c.value === this.value()),
    ),
  );

  protected select(category: Category): void {
    if (this.disabled() || this.readonly()) return;
    this.value.set(category);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const n = this.categories.length;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % n;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + n) % n;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = n - 1;
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.select(this.categories[index].value);
        return;
      default:
        return;
    }
    event.preventDefault();
    // Radio-group semantics: arrows move focus and selection together.
    this.select(this.categories[next].value);
    this.tiles()[next]?.nativeElement.focus();
  }

  protected onFocusOut(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (!host.contains(event.relatedTarget as Node | null)) this.touch.emit();
  }

  focus(options?: FocusOptions): void {
    this.tiles()[this.activeIndex()]?.nativeElement.focus(options);
  }
}
