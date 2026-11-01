import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { mockApiInterceptor } from './core/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    // [SF] provideSignalFormsConfig({ classes }) — status classes on every bound control
    provideSignalFormsConfig({
      classes: {
        'is-invalid': ({ state }) => state().touched() && state().invalid(),
        'is-pending': ({ state }) => state().pending(),
        'is-dirty': ({ state }) => state().dirty(),
      },
    }),
  ],
};
