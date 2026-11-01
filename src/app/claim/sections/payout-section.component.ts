import { Component, computed, inject, input } from '@angular/core';
import { DemoMode } from '../../core/demo-mode.service';
import { SectionCardComponent } from '../../ui/card/section-card.component';
import { MoneyInputComponent } from '../../ui/controls/money-input.component';
import { SwitchComponent } from '../../ui/controls/switch.component';
import { errorsId, FIELD_IMPORTS } from '../../ui/field';
import { type ClaimForm, normalizeIban } from '../claim-form';

export function groupIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})(?=.)/g, '$1 ');
}

@Component({
  selector: 'app-payout-section',
  imports: [SectionCardComponent, MoneyInputComponent, SwitchComponent, ...FIELD_IMPORTS],
  template: `
    @let p = f().payout;
    <app-section-card [index]="5" title="Wypłata" [nodes]="[p]">
      <fieldset class="radios">
        <legend class="field__label">
          Forma wypłaty
          @if (demo.showApi()) {
            <code class="api-badge">native radio [formField]</code>
          }
        </legend>
        <label class="radio">
          <input type="radio" value="transfer" [formField]="p.method" />
          <span>Przelew na konto</span>
        </label>
        <label class="radio">
          <input type="radio" value="cash" [formField]="p.method" />
          <span>Gotówka w kasie</span>
        </label>
      </fieldset>

      @if (!p.iban().hidden()) {
        <app-field [field]="p.iban" label="Numer rachunku (IBAN)">
          <input
            class="input input--mono"
            type="text"
            autocomplete="off"
            placeholder="PL00 0000 0000 0000 0000 0000 0000"
            [formField]="p.iban"
            (blur)="formatIban()"
          />
        </app-field>
      }

      <div class="grid grid--2 grid--center">
        <app-field [field]="p.hadAdvance" label="" [custom]="true">
          <app-switch [formField]="p.hadAdvance" [describedBy]="advanceSwitchErrors()"
            >Pobrano zaliczkę</app-switch
          >
        </app-field>
        <app-field [field]="p.advance" label="Kwota zaliczki" [showErrors]="false">
          <!-- [SF] disabled() with reason — the control shows the reason itself -->
          <app-money-input [formField]="p.advance" />
        </app-field>
      </div>
    </app-section-card>
  `,
})
export class PayoutSectionComponent {
  readonly f = input.required<ClaimForm>();
  protected readonly demo = inject(DemoMode);
  protected readonly advanceSwitchErrors = computed(() =>
    errorsId(this.f().payout.hadAdvance().name()),
  );

  protected formatIban(): void {
    const iban = this.f().payout.iban().value;
    const grouped = groupIban(iban());
    if (grouped !== iban()) iban.set(grouped);
  }
}
