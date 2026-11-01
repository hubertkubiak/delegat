import { Service, signal } from '@angular/core';
import type { CostCenterResponse } from './cost-center.types';

/**
 * Keeps the most recent cost-center lookup made by the async validator,
 * so the UI can show "✓ <name>" without issuing a second request.
 * It is only meaningful while the cost-center field is valid (not pending).
 */
@Service()
export class CostCenterDirectory {
  private readonly last = signal<CostCenterResponse | null>(null);
  readonly lastResolved = this.last.asReadonly();

  remember(response: CostCenterResponse): void {
    this.last.set(response);
  }
}
