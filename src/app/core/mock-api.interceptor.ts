import {
  type HttpEvent,
  type HttpInterceptorFn,
  HttpErrorResponse,
  type HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { type Observable, of, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { ExpenseClaim } from '../claim/claim.model';
import type { CostCenterResponse, DepartmentFieldConfig } from './cost-center.types';

/** Simulated network latency in ms. Tests override it with `() => 0`. */
export const MOCK_API_DELAY = new InjectionToken<() => number>('MOCK_API_DELAY', {
  factory: () => () => 500 + Math.round(Math.random() * 400),
});

const COST_CENTERS: Readonly<Record<string, CostCenterResponse>> = {
  'MPK-1001': { active: true, name: 'Sprzedaż Północ' },
  'MPK-1002': { active: true, name: 'Sprzedaż Południe' },
  'MPK-1003': { active: true, name: 'Rozwój oprogramowania' },
  'MPK-1004': { active: true, name: 'Infrastruktura IT' },
  'MPK-1005': { active: true, name: 'Logistyka' },
  'MPK-9999': { active: false, name: 'Projekt zamknięty' },
};

const DEPARTMENT_FIELDS: Readonly<Record<string, DepartmentFieldConfig[]>> = {
  SALES: [
    { key: 'crmId', label: 'Numer klienta / CRM', kind: 'text', required: true, hint: '' },
    { key: 'meetings', label: 'Liczba spotkań', kind: 'number', required: false, hint: '' },
  ],
  IT: [
    {
      key: 'jira',
      label: 'Numer zgłoszenia JIRA',
      kind: 'text',
      required: true,
      hint: 'np. OPS-123',
    },
  ],
  OPS: [],
};

interface MockResult {
  status: number;
  body: unknown;
}

function route(req: HttpRequest<unknown>): MockResult | null {
  const path = req.url.replace(/^.*?(\/api\/)/, '/api/');

  const costCenter = /^\/api\/cost-centers\/([^/]+)$/.exec(path);
  if (req.method === 'GET' && costCenter) {
    const found = COST_CENTERS[decodeURIComponent(costCenter[1])];
    return found
      ? { status: 200, body: found }
      : { status: 404, body: { message: 'Nie znaleziono MPK' } };
  }

  const department = /^\/api\/departments\/([^/]+)\/fields$/.exec(path);
  if (req.method === 'GET' && department) {
    const fields = DEPARTMENT_FIELDS[department[1]];
    return fields
      ? { status: 200, body: fields }
      : { status: 404, body: { message: 'Nieznany dział' } };
  }

  if (req.method === 'POST' && path === '/api/claims') {
    const claim = req.body as ExpenseClaim;
    if (/duplikat/i.test(claim.trip.purpose)) {
      return {
        status: 422,
        body: { field: 'trip.purpose', message: 'Podobny wniosek już istnieje' },
      };
    }
    const no = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
    return { status: 201, body: { id: `DEL/2026/${no}` } };
  }

  return null;
}

/** Simulates the backend so the app runs as a static site (GitHub Pages). */
export const mockApiInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  if (!req.url.includes('/api/')) return next(req);

  const delay = inject(MOCK_API_DELAY)();
  const result = route(req);

  return timer(delay).pipe(
    mergeMap(() => {
      if (!result) {
        return throwError(
          () => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: req.url }),
        );
      }
      if (result.status >= 400) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: result.status,
              statusText: result.status === 422 ? 'Unprocessable Entity' : 'Not Found',
              error: result.body,
              url: req.url,
            }),
        );
      }
      return of(new HttpResponse({ status: result.status, body: result.body, url: req.url }));
    }),
  );
};
