import { Component, input } from '@angular/core';
import { SectionCardComponent } from '../../ui/card/section-card.component';
import { FIELD_IMPORTS } from '../../ui/field';
import type { ClaimForm } from '../claim-form';

@Component({
  selector: 'app-extras-section',
  imports: [SectionCardComponent, ...FIELD_IMPORTS],
  template: `
    @let extras = f().extras;
    <app-section-card [index]="4" title="Informacje dla działu" [nodes]="[extras]">
      @if (!department()) {
        <p class="empty">Wybierz dział w sekcji 1 — pola pojawią się tutaj.</p>
      } @else if (loading()) {
        <p class="empty">
          <span class="spinner" aria-hidden="true"></span> Wczytuję konfigurację działu…
        </p>
      } @else {
        <div class="grid grid--2">
          <!-- [SF] dynamic controls rendered from department config (httpResource → model.update) -->
          @for (x of extras; track x().value().key) {
            <app-field [field]="x.value" [label]="x.label().value()">
              @switch (x.kind().value()) {
                @case ('number') {
                  <input
                    class="input input--num"
                    type="text"
                    inputmode="decimal"
                    [formField]="x.value"
                  />
                }
                @default {
                  <input class="input" type="text" [formField]="x.value" />
                }
              }
            </app-field>
          } @empty {
            <p class="empty">Ten dział nie wymaga dodatkowych informacji.</p>
          }
        </div>
      }
    </app-section-card>
  `,
})
export class ExtrasSectionComponent {
  readonly f = input.required<ClaimForm>();
  readonly department = input('');
  readonly loading = input(false);
}
