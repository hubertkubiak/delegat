import { z } from 'zod/mini';
import { tripDays } from '../claim.calc';

/** Max trip length under the strict policy (days, inclusive). */
export const STRICT_MAX_DAYS = 14;

// `zod/mini` keeps the bundle small; both schemas implement Standard Schema.
const dates = {
  startDate: z.string().check(z.minLength(1, 'Podaj datę wyjazdu')),
  endDate: z.string().check(z.minLength(1, 'Podaj datę powrotu')),
};

/** Standard travel policy: short purpose, any duration. */
export const standardTripSchema = z.object({
  purpose: z.string().check(z.minLength(10, 'Cel podróży: co najmniej 10 znaków')),
  ...dates,
});

/** Strict travel policy: detailed purpose and at most 14 days. */
export const strictTripSchema = z
  .object({
    purpose: z
      .string()
      .check(z.minLength(30, 'Polityka ścisła: opisz cel w co najmniej 30 znakach')),
    ...dates,
  })
  .check(
    z.refine((t) => tripDays(t.startDate, t.endDate) <= STRICT_MAX_DAYS, {
      message: `Polityka ścisła: delegacja może trwać maksymalnie ${STRICT_MAX_DAYS} dni`,
      path: ['endDate'],
    }),
  );
