import { Component, computed, inject, input, model } from '@angular/core';
import { DemoMode } from '../../core/demo-mode.service';
import { SectionCardComponent } from '../../ui/card/section-card.component';
import { SwitchComponent } from '../../ui/controls/switch.component';
import { errorsId, FIELD_IMPORTS } from '../../ui/field';
import { tripDays } from '../claim.calc';
import { COUNTRIES } from '../claim.config';
import type { ClaimForm } from '../claim-form';
import { STRICT_MAX_DAYS } from '../schemas/trip.zod';

@Component({
  selector: 'app-trip-section',
  imports: [SectionCardComponent, SwitchComponent, ...FIELD_IMPORTS],
  template: `
    @let t = f().trip;
    <app-section-card [index]="2" title="Podróż" [nodes]="[t]">
      <div sectionExtra class="policy">
        <app-switch [(checked)]="strictPolicy">
          Polityka: <strong>{{ strictPolicy() ? 'ścisła' : 'standardowa' }}</strong>
        </app-switch>
        <span class="policy__hint">
          {{ strictPolicy() ? 'cel ≥ 30 znaków, maks. ' + maxDays + ' dni' : 'cel ≥ 10 znaków' }}
        </span>
        @if (demo.showApi()) {
          <code class="api-badge">validateStandardSchema(() => zod)</code>
        }
      </div>

      <app-field [field]="t.purpose" label="Cel podróży">
        <input class="input" type="text" [formField]="t.purpose" />
      </app-field>

      <div class="grid grid--3">
        <app-field [field]="t.destination.city" label="Miasto">
          <input
            class="input"
            type="text"
            autocomplete="address-level2"
            [formField]="t.destination.city"
          />
        </app-field>
        <app-field [field]="t.destination.postalCode" label="Kod pocztowy">
          <input
            class="input input--mono"
            type="text"
            placeholder="00-000"
            autocomplete="postal-code"
            [formField]="t.destination.postalCode"
          />
        </app-field>
        <app-field [field]="t.destination.country" label="Kraj">
          <select class="input select" [formField]="t.destination.country">
            @for (c of countries; track c.value) {
              <option [value]="c.value">{{ c.label }}</option>
            }
          </select>
        </app-field>
      </div>

      <div class="grid grid--3">
        <app-field [field]="t.startDate" label="Data wyjazdu">
          <input class="input" type="date" [formField]="t.startDate" />
        </app-field>
        <app-field [field]="t.endDate" label="Data powrotu">
          <input class="input" type="date" [formField]="t.endDate" />
        </app-field>
        <div class="trip-days" aria-live="polite">
          @if (days() > 0) {
            <span class="trip-days__n">{{ days() }}</span> {{ days() === 1 ? 'dzień' : 'dni' }}
          }
        </div>
      </div>

      <app-field [field]="t.abroad" label="" [custom]="true">
        <!-- [SF] FormCheckboxControl bound with [formField] -->
        <app-switch [formField]="t.abroad" [describedBy]="abroadErrorsId()"
          >Delegacja zagraniczna</app-switch
        >
      </app-field>
    </app-section-card>
  `,
})
export class TripSectionComponent {
  readonly f = input.required<ClaimForm>();
  readonly strictPolicy = model.required<boolean>();

  protected readonly demo = inject(DemoMode);
  protected readonly countries = COUNTRIES;
  protected readonly maxDays = STRICT_MAX_DAYS;

  protected readonly days = computed(() => {
    const { startDate, endDate } = this.f().trip().value();
    return tripDays(startDate, endDate);
  });
  protected readonly abroadErrorsId = computed(() => errorsId(this.f().trip.abroad().name()));
}
