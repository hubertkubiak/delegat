import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { emptyClaim } from '../claim/claim.model';
import type { CostCenterResponse, DepartmentFieldConfig } from './cost-center.types';
import { MOCK_API_DELAY, mockApiInterceptor } from './mock-api.interceptor';

describe('mockApiInterceptor', () => {
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockApiInterceptor])),
        { provide: MOCK_API_DELAY, useValue: () => 0 },
      ],
    });
    http = TestBed.inject(HttpClient);
  });

  const statusOf = (p: Promise<unknown>) =>
    p.then(
      () => 200,
      (e: unknown) => (e instanceof HttpErrorResponse ? e.status : -1),
    );

  it('returns an active cost center', async () => {
    const res = await firstValueFrom(http.get<CostCenterResponse>('/api/cost-centers/MPK-1001'));
    expect(res).toEqual({ active: true, name: 'Sprzedaż Północ' });
  });

  it('returns MPK-9999 as inactive', async () => {
    const res = await firstValueFrom(http.get<CostCenterResponse>('/api/cost-centers/MPK-9999'));
    expect(res.active).toBe(false);
  });

  it('responds 404 for an unknown cost center', async () => {
    expect(await statusOf(firstValueFrom(http.get('/api/cost-centers/MPK-0000')))).toBe(404);
  });

  it('serves department field configuration', async () => {
    const sales = await firstValueFrom(
      http.get<DepartmentFieldConfig[]>('/api/departments/SALES/fields'),
    );
    const ops = await firstValueFrom(
      http.get<DepartmentFieldConfig[]>('/api/departments/OPS/fields'),
    );
    expect(sales.map((f) => f.key)).toEqual(['crmId', 'meetings']);
    expect(ops).toEqual([]);
  });

  it('creates a claim, or rejects a "duplikat" with 422 pointing at trip.purpose', async () => {
    const ok = emptyClaim();
    ok.trip.purpose = 'Konferencja';
    const res = await firstValueFrom(http.post<{ id: string }>('/api/claims', ok));
    expect(res.id).toMatch(/^DEL\/2026\/\d{4}$/);

    const dup = emptyClaim();
    dup.trip.purpose = 'To jest duplikat';
    const err = await firstValueFrom(http.post('/api/claims', dup)).catch(
      (e: HttpErrorResponse) => e,
    );
    expect(err).toBeInstanceOf(HttpErrorResponse);
    expect((err as HttpErrorResponse).status).toBe(422);
    expect((err as HttpErrorResponse).error).toEqual({
      field: 'trip.purpose',
      message: 'Podobny wniosek już istnieje',
    });
  });
});
