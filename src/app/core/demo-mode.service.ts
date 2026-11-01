import { Service, signal } from '@angular/core';

/** The "Show API" toggle — when on, every field shows which Signal Forms APIs drive it. */
@Service()
export class DemoMode {
  readonly showApi = signal(false);
}
