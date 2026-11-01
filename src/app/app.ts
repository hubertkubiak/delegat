import { Component, inject } from '@angular/core';
import { ClaimPageComponent } from './claim/claim-page.component';
import { DemoMode } from './core/demo-mode.service';
import { SwitchComponent } from './ui/controls/switch.component';
import { ToastsComponent } from './ui/toast/toast';

@Component({
  selector: 'app-root',
  imports: [ClaimPageComponent, SwitchComponent, ToastsComponent],
  template: `
    <a class="skip-link" href="#main">Przejdź do formularza</a>
    <header class="app-header">
      <div class="app-header__inner">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true">D</span>
          <div>
            <p class="brand__name">Delegat</p>
            <p class="brand__sub">Rozliczenie podróży służbowej</p>
          </div>
        </div>
        <app-switch [(checked)]="demo.showApi">Pokaż API</app-switch>
      </div>
    </header>
    <main id="main" class="app-main">
      <h1 class="sr-only">Rozliczenie delegacji</h1>
      <app-claim-page />
    </main>
    <app-toasts />
  `,
})
export class App {
  protected readonly demo = inject(DemoMode);
}
