import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { MoneyInputComponent, parseMoneyInput } from './money-input.component';

@Component({
  imports: [MoneyInputComponent, FormField],
  template: `<app-money-input [formField]="f.amount" />`,
})
class HostComponent {
  readonly model = signal({ amount: 0 });
  readonly f = form(this.model);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const type = async (text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, input, type };
}

describe('MoneyInputComponent', () => {
  it('parses Polish and dotted formats', () => {
    expect(parseMoneyInput('1 234,50')).toBe(1234.5);
    expect(parseMoneyInput('1234.5')).toBe(1234.5);
    expect(parseMoneyInput('1\u00a0234,5')).toBe(1234.5);
    expect(parseMoneyInput('')).toBe(0);
    expect(parseMoneyInput('12,345')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
  });

  it('writes "1 234,50" to the model as 1234.5', async () => {
    const { host, type } = await setup();
    await type('1 234,50');
    expect(host.model().amount).toBe(1234.5);
    expect(host.f.amount().errors()).toEqual([]);
  });

  it('reports a parse error and leaves the model unchanged for "abc"', async () => {
    const { host, type } = await setup();
    await type('12');
    await type('abc');
    expect(host.model().amount).toBe(12);
    expect(
      host.f
        .amount()
        .errors()
        .map((e) => e.kind),
    ).toEqual(['parse']);
  });

  it('clears the parse error on reset', async () => {
    const { fixture, host, type, input } = await setup();
    await type('abc');
    expect(host.f.amount().invalid()).toBe(true);

    host.f.amount().reset(5);
    await fixture.whenStable();
    expect(host.f.amount().errors()).toEqual([]);
    expect(host.model().amount).toBe(5);
    expect(input.value).toBe('5,00');
  });

  it('formats the value on blur and marks the field touched', async () => {
    const { host, type, input } = await setup();
    input.focus();
    await type('99,5');
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('99,50');
    expect(host.f.amount().touched()).toBe(true);
  });
});
