import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import type { Category } from '../../claim/claim.model';
import { CategoryPickerComponent } from './category-picker.component';

@Component({
  imports: [CategoryPickerComponent, FormField],
  template: `<app-category-picker [formField]="f.category" />`,
})
class HostComponent {
  readonly model = signal<{ category: Category }>({ category: 'transport' });
  readonly f = form(this.model);
}

describe('CategoryPickerComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const tiles = () =>
      [...fixture.nativeElement.querySelectorAll('[role="radio"]')] as HTMLButtonElement[];
    const press = async (key: string) => {
      const active = tiles().find((t) => t.tabIndex === 0)!;
      active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, host: fixture.componentInstance, tiles, press };
  }

  it('moves the selection with arrow keys and wraps around', async () => {
    const { host, press, tiles } = await setup();
    await press('ArrowRight');
    expect(host.model().category).toBe('car');
    expect(tiles()[1].getAttribute('aria-checked')).toBe('true');
    expect(tiles()[1].tabIndex).toBe(0);
    expect(tiles()[0].tabIndex).toBe(-1);

    await press('ArrowLeft');
    await press('ArrowLeft');
    expect(host.model().category).toBe('other');
  });

  it('selects on click', async () => {
    const { host, tiles, fixture } = await setup();
    tiles()[2].click();
    await fixture.whenStable();
    expect(host.model().category).toBe('hotel');
  });
});
