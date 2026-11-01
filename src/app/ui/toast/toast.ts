import { Component, inject, Service, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'info';
}

@Service()
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<readonly Toast[]>([]);

  show(text: string, tone: Toast['tone'] = 'success'): void {
    const toast = { id: this.nextId++, text, tone };
    this.toasts.update((t) => [...t, toast]);
    setTimeout(() => this.dismiss(toast.id), 3500);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}

@Component({
  selector: 'app-toasts',
  host: { class: 'toasts', 'aria-live': 'polite', role: 'status' },
  template: `
    @for (t of toasts.toasts(); track t.id) {
      <div class="toast" [class.toast--success]="t.tone === 'success'">
        <svg class="toast__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <span>{{ t.text }}</span>
        <button
          type="button"
          class="toast__close"
          (click)="toasts.dismiss(t.id)"
          aria-label="Zamknij powiadomienie"
        >
          ×
        </button>
      </div>
    }
  `,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
}
