import { Component, computed, inject, input } from '@angular/core';
import { CostCenterDirectory } from '../../core/cost-center-directory.service';
import { SectionCardComponent } from '../../ui/card/section-card.component';
import { FIELD_IMPORTS } from '../../ui/field';
import { DEPARTMENTS } from '../claim.config';
import type { ClaimForm } from '../claim-form';

@Component({
  selector: 'app-employee-section',
  imports: [SectionCardComponent, ...FIELD_IMPORTS],
  template: `
    @let e = f().employee;
    <app-section-card [index]="1" title="Pracownik" [nodes]="[e]">
      <div class="grid grid--2">
        <app-field [field]="e.fullName" label="Imię i nazwisko">
          <!-- [SF] FormField — native input bound with [formField] -->
          <input class="input" type="text" autocomplete="name" [formField]="e.fullName" />
        </app-field>
        <app-field [field]="e.email" label="E-mail służbowy">
          <input class="input" type="email" autocomplete="email" [formField]="e.email" />
        </app-field>
        <app-field [field]="e.department" label="Dział">
          <select class="input select" [formField]="e.department">
            <option value="">— wybierz —</option>
            @for (d of departments; track d.value) {
              <option [value]="d.value">{{ d.label }}</option>
            }
          </select>
        </app-field>
        <app-field [field]="e.costCenter" label="MPK (centrum kosztów)">
          <div class="input-wrap">
            <input
              class="input input--mono"
              type="text"
              placeholder="MPK-0000"
              autocomplete="off"
              [formField]="e.costCenter"
            />
          </div>
          <p class="mpk-status" aria-live="polite">
            <!-- [SF] pending() — async validator in flight -->
            @if (e.costCenter().pending()) {
              <span class="mpk-status__pending"
                ><span class="spinner" aria-hidden="true"></span> Sprawdzam MPK…</span
              >
            } @else if (costCenterName(); as name) {
              <span class="mpk-status__ok">✓ {{ name }}</span>
            }
          </p>
        </app-field>
      </div>
    </app-section-card>
  `,
})
export class EmployeeSectionComponent {
  readonly f = input.required<ClaimForm>();

  protected readonly departments = DEPARTMENTS;
  private readonly directory = inject(CostCenterDirectory);

  protected readonly costCenterName = computed(() => {
    const field = this.f().employee.costCenter();
    const last = this.directory.lastResolved();
    return field.valid() && last?.active ? last.name : null;
  });
}
