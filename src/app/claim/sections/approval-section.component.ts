import { Component, computed, input } from '@angular/core';
import { SectionCardComponent } from '../../ui/card/section-card.component';
import { SwitchComponent } from '../../ui/controls/switch.component';
import { errorsId, FIELD_IMPORTS } from '../../ui/field';
import type { ClaimForm } from '../claim-form';

@Component({
  selector: 'app-approval-section',
  imports: [SectionCardComponent, SwitchComponent, ...FIELD_IMPORTS],
  template: `
    @let root = f();
    <app-section-card
      [index]="6"
      title="Akceptacja"
      [nodes]="[root.approverEmail, root.notes, root.declaration]"
    >
      <app-field [field]="root.approverEmail" label="E-mail osoby akceptującej">
        <input class="input" type="email" autocomplete="off" [formField]="root.approverEmail" />
      </app-field>

      <app-field [field]="root.notes" label="Uwagi (opcjonalnie)">
        <textarea class="input textarea" rows="3" [formField]="root.notes"></textarea>
        <!-- [SF] debounce(300) — controlValue() updates per keystroke, value() after 300 ms -->
        <p class="counter" aria-live="off">
          <span
            >w polu: <strong class="num">{{ root.notes().controlValue().length }}</strong></span
          >
          <span
            >w modelu: <strong class="num">{{ root.notes().value().length }}</strong></span
          >
          <span class="muted">/ 500</span>
        </p>
      </app-field>

      <app-field [field]="root.declaration" label="" [custom]="true">
        <app-switch [formField]="root.declaration" [describedBy]="declarationErrors()">
          Oświadczam, że wydatki są zgodne z polityką podróży służbowych
        </app-switch>
      </app-field>
    </app-section-card>
  `,
})
export class ApprovalSectionComponent {
  readonly f = input.required<ClaimForm>();
  protected readonly declarationErrors = computed(() => errorsId(this.f().declaration().name()));
}
