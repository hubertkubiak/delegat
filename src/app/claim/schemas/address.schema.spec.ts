import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import type { Address } from '../claim.model';
import { addressSchema } from './address.schema';

function addressForm(address: Address) {
  const model = signal(address);
  return TestBed.runInInjectionContext(() => form(model, addressSchema));
}

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);

describe('addressSchema', () => {
  it('requires a postal code for Poland', () => {
    const f = addressForm({ city: 'Gdańsk', postalCode: '', country: 'PL' });
    expect(f.postalCode().required()).toBe(true);
    expect(kinds(f.postalCode().errors())).toEqual(['required']);
  });

  it('checks the Polish postal code format', () => {
    const f = addressForm({ city: 'Gdańsk', postalCode: '80001', country: 'PL' });
    expect(kinds(f.postalCode().errors())).toEqual(['pattern']);

    f.postalCode().value.set('80-001');
    expect(f.postalCode().errors()).toEqual([]);
  });

  it('does not require or validate the postal code abroad', () => {
    const f = addressForm({ city: 'Berlin', postalCode: '', country: 'DE' });
    expect(f.postalCode().required()).toBe(false);
    expect(f.postalCode().errors()).toEqual([]);

    f.postalCode().value.set('10115');
    expect(f.postalCode().errors()).toEqual([]);
    expect(f().valid()).toBe(true);
  });

  it('requires city and country', () => {
    const f = addressForm({ city: '', postalCode: '', country: '' });
    expect(kinds(f.city().errors())).toEqual(['required']);
    expect(kinds(f.country().errors())).toEqual(['required']);
  });
});
