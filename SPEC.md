# SPEC — "Delegat": business-trip expense claims with Angular Signal Forms

> Specification for Claude Code. Build a small, polished SPA in **Angular 22** that showcases as much of **Signal Forms** (`@angular/forms/signals`, stable since v22) as possible on a realistic business case: an employee settles the costs of a business trip.
>
> API references: https://angular.love/signal-forms-in-angular-21-complete-guide and https://angular.dev/guide/forms/signals

---

## 0. Ground rules (read first)

1. **Verify API signatures in `node_modules/@angular/forms/**/signals*.d.ts` before using them.** The spec is based on the article; if a function has a different signature (e.g. `minDate` takes a `Date` instead of a string, `metadata()` has a different argument order), adapt the code and add a short note to the "API notes" section of the README.
2. Do not use Reactive Forms, `ngModel`, `ControlValueAccessor` or UI libraries (no Material/PrimeNG). All UI is built from custom components and CSS.
3. Angular 22 defaults: standalone, `OnPush`, zoneless, the new control flow (`@if`, `@for`, `@switch`), `inject()`, `input()/model()/output()`, `httpResource`.
4. Code and identifiers in English, **UI in Polish**.
5. After every major step, `ng build` and `ng test --watch=false` must pass.
6. The repo/project is named `signal-forms-delegat` (this matters for CI paths).

---

## 1. Business scenario

The employee fills in **one form**, "Rozliczenie delegacji" (trip expense claim), adds any number of expenses, chooses a payout method and sends the claim for approval. After submitting, they see a confirmation with the claim number. They can also save a draft (localStorage) and come back later.

The backend is simulated by an HTTP interceptor (the app runs on GitHub Pages without a server).

---

## 2. Data model

`src/app/claim/claim.model.ts`

```ts
export type Category = 'transport' | 'car' | 'hotel' | 'meal' | 'other';
export type Currency = 'PLN' | 'EUR';
export type DepartmentCode = '' | 'SALES' | 'IT' | 'OPS';

export interface Address {
  city: string;
  postalCode: string;
  country: string;          // 'PL' | 'DE' | ... (select)
}

export interface Expense {
  id: string;               // crypto.randomUUID()
  category: Category;
  date: string;             // ISO yyyy-mm-dd (input type="date")
  amount: number;           // hidden for 'car' — computed from km * ratePerKm
  currency: Currency;
  description: string;
  receiptNo: string;        // required when amount > 100
  km: number;               // 'car' only
  ratePerKm: number;        // 'car' only, readonly, constant from config
  nights: number;           // 'hotel' only
  attendees: number;        // 'meal' only
}

export interface ExtraField {   // dynamic fields from the department config
  key: string;
  label: string;
  kind: 'text' | 'number';
  required: boolean;
  hint: string;
  value: string;
}

export interface ExpenseClaim {
  employee: {
    fullName: string;
    email: string;
    department: DepartmentCode;
    costCenter: string;     // MPK-0000
  };
  trip: {
    purpose: string;
    destination: Address;
    startDate: string;
    endDate: string;
    abroad: boolean;
  };
  expenses: Expense[];
  extras: ExtraField[];
  payout: {
    method: 'transfer' | 'cash';
    iban: string;
    hadAdvance: boolean;
    advance: number;
  };
  approverEmail: string;
  notes: string;
  declaration: boolean;
}
```

Factories: `emptyClaim()`, `newExpense(category = 'transport')`. Remember: Signal Forms treats `undefined` as a missing field — initialise with `''`, `0`, `[]`, `false`.

Constant: `CAR_RATE_PER_KM = 0.89` in `claim.config.ts` (UI label: „stawka przykładowa” — example rate).

---

## 3. Signal Forms feature map → place in the app

This is the heart of the project. **Every item must be implemented** and marked in code with a `// [SF] <name>` comment so it is easy to grep.

| # | API | Where / why |
|---|-----|-------------|
| 1 | `form(model, schemaFn, { submission })` | Main form in `ClaimFormComponent` |
| 2 | `FormField`, `FormRoot` | `<form [formRoot]>`, every field `[formField]` |
| 3 | `required`, `email`, `minLength`, `maxLength`, `pattern`, `min`, `max` with `{ message }` | employee data, trip purpose, IBAN, km, number of attendees |
| 4 | `required(..., { when })` | receipt number required when `amount > 100`; extra field required when `extra.required` |
| 5 | cross-field `validate()` (`valueOf`) | `endDate >= startDate`; expense date within the trip dates; `approverEmail !== employee.email` |
| 6 | `validateTree()` | advance > expense total → the error lands on `payout.advance` |
| 7 | `validateHttp()` with `debounce` | cost-center check: `GET /api/cost-centers/:code` |
| 8 | `validateStandardSchema()` + Zod, **dynamic** (lambda) | `trip` section: a "Policy: standard / strict" toggle swaps the Zod schema on the fly |
| 9 | `schema<T>()` + `apply()` | `addressSchema` for `trip.destination` |
| 10 | `applyEach()` | `expenseSchema` for every expense + an inline schema with access to the root (date range, currency) |
| 11 | `applyWhen()` | `carSchema`, `hotelSchema`, `mealSchema` depending on `category` |
| 12 | `hidden({ when })` + `@if (!f().hidden())` | km/rate only for car, nights for hotel, attendees for meal, amount hidden for car, IBAN hidden for cash |
| 13 | `disabled({ when })` returning a **string** (reason) | EUR currency blocked for a domestic trip; advance blocked when `!hadAdvance` — the reason is shown under the field |
| 14 | `readonly()` | `ratePerKm` |
| 15 | `debounce(path, 300)` and `debounce(path, 'blur')` | `notes` (300 ms, a character counter shows model vs. input), `employee.fullName` ('blur') |
| 16 | `metadata()` + `createMetadataKey()` | `HELP_TEXT` (hint under the field) and `API_BADGE` (name of the API used, shown in demo mode) |
| 17 | Custom control `FormValueControl<number>` + `transformedValue()` + parse error + `focus()` | `MoneyInputComponent` |
| 18 | Custom control `FormValueControl<Category>` | `CategoryPickerComponent` (tiles, keyboard-accessible radiogroup) |
| 19 | Custom control `FormCheckboxControl` | `SwitchComponent` (declaration, "advance taken", "abroad") |
| 20 | Optional control inputs: `errors`, `touched` + `touch` output, `invalid`, `disabled`, `disabledReasons`, `readonly`, `required`, `pending`, `min`, `max` | all custom controls |
| 21 | `provideSignalFormsConfig({ classes })` | classes `is-invalid` (touched && invalid), `is-pending`, `is-dirty` |
| 22 | `submission.action` returning a server error with `fieldTree` | the mock returns 422 → error on a field |
| 23 | `ignoreValidators: 'none'` + `onInvalid` + `errorSummary()` + `focusBoundControl()` | submission waits for async validation; jump to the first error |
| 24 | standalone `submit(form, { ignoreValidators: 'all', action })` | "Save draft" button |
| 25 | `submitting()`, `pending()`, `valid()`, `dirty()`, `touched()` | buttons, state inspector |
| 26 | `reset(value)`, `markAsTouched()` | "New claim"; "Check section" in the section header |
| 27 | Dynamically adding/removing controls via `model.update()` | expense list + department config fields loaded with `httpResource` |

---

## 4. Validation — details

Files: `src/app/claim/schemas/*.ts` (pure functions, easy to test).

**Employee**
- `fullName`: required, minLength 3. `debounce('blur')`.
- `email`: required, email.
- `department`: required (select). Changing the department → `httpResource` fetches `GET /api/departments/:code/fields` → an `effect` runs `model.update(m => ({ ...m, extras: fields.map(f => ({ ...f, value: '' })) }))`.
- `costCenter`: required, `pattern(/^MPK-\d{4}$/, { message: 'Format: MPK-0000' })`, `validateHttp` (debounce 400; request only when the pattern matches). Response `{ active: boolean, name: string }`; `active: false` → `{ kind: 'inactive', message: 'MPK nieaktywne' }`; 404 → `onError` → „Nie znaleziono MPK”. In the UI: a spinner while `pending()`, a green "✓ <name>" when OK.

**Trip** (`validateStandardSchema` with dynamic Zod)
- `standardTripSchema`: purpose at least 10 characters, dates not empty.
- `strictTripSchema`: purpose at least 30, trip at most 14 days (refine on the object).
- Signal `strictPolicy = signal(false)` toggled by a switch above the section; `validateStandardSchema(f.trip, () => strictPolicy() ? strictTripSchema : standardTripSchema)`.
- Additionally `validate(f.trip.endDate, ...)` → `endDate >= startDate`.
- `apply(f.trip.destination, addressSchema)`: city required; country required; postalCode required + `pattern(/^\d{2}-\d{3}$/)` **only when country === 'PL'** (`applyWhen` inside the schema or `when`).

**Expenses** (`applyEach`)
- `expenseSchema`: category required, date required, description maxLength 120, `receiptNo` required `when amount > 100`.
- `applyWhen(item, cat === 'car', carSchema)`: km required, min 1, max 2000.
- `applyWhen(item, cat === 'hotel', hotelSchema)`: nights min 1, max 30; amount min 1.
- `applyWhen(item, cat === 'meal', mealSchema)`: attendees min 1, max 20; amount min 1.
- others: amount min 0.01, max 50 000.
- Inline in `form()` (access to the root via closure): expense date within `[startDate, endDate]`; `disabled(item.currency, { when: () => !abroad ? 'Waluta obca tylko dla delegacji zagranicznych' : false })`.
- List: `minLength(f.expenses, 1, { message: 'Dodaj co najmniej jeden wydatek' })` (not `required` — an empty array passes `required`).

**Department extra fields** (`applyEach(f.extras, ...)`)
- `required(extra.value, { when: ctx => ctx.valueOf(extra.required) })`.
- `validate(extra.value, ...)` → for `kind === 'number'` it must be a number.
- Rendered dynamically with `@for` + `@switch (kind)`.

Mock configuration:
- `SALES`: „Numer klienta / CRM” (customer / CRM number; text, required), „Liczba spotkań” (number of meetings; number).
- `IT`: „Numer zgłoszenia JIRA” (JIRA ticket number; text, required, hint „np. OPS-123”).
- `OPS`: no fields → the section shows „Ten dział nie wymaga dodatkowych informacji” (this department needs no extra information).

**Payout**
- `method`: radio (native `[formField]` on two radio inputs).
- `iban`: `hidden` when cash; required + `pattern(/^PL\d{26}$/)` after stripping spaces (do it in `validate` or normalise in a custom input). Display in groups of 4.
- `hadAdvance`: switch. `advance`: `disabled` with a reason when `!hadAdvance`; MoneyInput.
- `validateTree(f, ...)`: if `hadAdvance && advance > total` → `{ kind: 'advance-too-high', message: 'Zaliczka przekracza sumę wydatków — różnicę zwrócisz w kasie', fieldTree: ctx.fieldTree.payout.advance }`.

**Approval**
- `approverEmail`: required, email, `validate` ≠ `employee.email`.
- `notes`: maxLength 500, `debounce(300)`.
- `declaration`: `required` (false = empty) with the message „Potwierdź zgodność z polityką”.

`total` = a `computed` in a service/component: sum of `amount` (for car: `km * ratePerKm`), EUR converted at a fixed rate `EUR_RATE = 4.30` (label „kurs poglądowy” — indicative rate). **Do not** store total in the model.

---

## 5. Custom controls (`src/app/ui/controls/`)

### `MoneyInputComponent` — `FormValueControl<number>`
- `value = model(0)`; `rawValue = transformedValue(this.value, { format: v => pl-PL with 2 decimals, parse: accepts "1 234,50" / "1234.5" → number; otherwise `{ error: { kind: 'parse', message: 'Wpisz kwotę, np. 120,50' } }` })`.
- Inputs: `errors`, `touched`, `invalid`, `disabled`, `disabledReasons`, `readonly`, `required`, `min`, `max`, `name`. Output `touch` emitted on blur.
- Currency suffix (`input currency = 'PLN'`), `inputmode="decimal"`, right-aligned, tabular figures.
- `focus()` (so `focusBoundControl()` works) — focus + select.
- Shows errors itself (reusable `FieldErrors` component), `aria-invalid`, `aria-describedby`.

### `CategoryPickerComponent` — `FormValueControl<Category>`
- 5 tiles with an inline SVG icon + label: Transport publiczny, Samochód prywatny, Nocleg, Posiłek, Inne (public transport, private car, accommodation, meal, other).
- `role="radiogroup"`, roving tabindex, ←/→ arrows, Space/Enter selects. `touch` when focus leaves the group.
- Respects `disabled`/`readonly`.

### `SwitchComponent` — `FormCheckboxControl`
- `checked = model(false)`; do NOT declare `value`. `role="switch"`, `aria-checked`, label via `<ng-content>`.

### Helpers (not controls)
- `FieldComponent` — wrapper: label, `required` asterisk, hint from `HELP_TEXT`, slot for the input, `FieldErrors`, `API_BADGE` badge in demo mode. Takes `field` (FieldTree) to read state.
- `FieldErrorsComponent` — shows `errors()` when `touched()`; for `disabledReasons`, grey text with a lock icon.

---

## 6. Mock API (`src/app/core/mock-api.interceptor.ts`)

`provideHttpClient(withInterceptors([mockApiInterceptor]))`, delay 500–900 ms (random).

| Endpoint | Response |
|---|---|
| `GET /api/cost-centers/MPK-1001` … `MPK-1005` | `{ active: true, name: 'Sprzedaż Północ' … }` |
| `GET /api/cost-centers/MPK-9999` | `{ active: false, name: 'Projekt zamknięty' }` |
| other `MPK-xxxx` | 404 |
| `GET /api/departments/:code/fields` | the configuration from section 4 |
| `POST /api/claims` | 201 `{ id: 'DEL/2026/' + 4 digits }`; if `trip.purpose` contains „duplikat” → 422 `{ field: 'trip.purpose', message: 'Podobny wniosek już istnieje' }` |

The submit action maps the 422 to an error with a `fieldTree` pointing at the right field.

List the "magic" test values in the README (MPK-1001, MPK-9999, „duplikat”).

---

## 7. UI / UX

### Layout
- Header: text logo „Delegat” + subtitle „Rozliczenie podróży służbowej”, and on the right a **„Pokaż API”** (Show API) toggle (demo mode: a badge with the Signal Forms feature name next to every field, from `API_BADGE`).
- Desktop (≥ 1024 px): two columns — the form (max ~720 px) + a sticky 340 px side panel.
- Mobile: side panel below the form, sticky action bar at the bottom.

### Form sections (cards)
1. Pracownik (Employee) — 2. Podróż (Trip) (+ policy toggle) — 3. Wydatki (Expenses) — 4. Informacje dla działu (Department info, dynamic) — 5. Wypłata (Payout) — 6. Akceptacja (Approval).
Each card: a number in a circle, title, status (green ✓ when the section is `valid()`, error count when invalid & touched), a „Sprawdź sekcję” (Check section) link → `markAsTouched()` on the node.

### Expenses
- A list of expense cards; row header: category icon, description, amount on the right. Expandable/collapsible (a new one starts expanded).
- „+ Dodaj wydatek” (Add expense; ghost button with a dashed border) → `model.update` + focus on the new row's picker.
- Delete (trash icon, inline confirmation „Usunąć? Tak / Nie”), Duplicate.
- `@for (item of f.expenses; track item().value().id)` — check what to track by (id from the model).
- 150 ms entry animation, disabled under `prefers-reduced-motion`.

### Side panel
1. **Summary**: number of expenses, total per category (mini CSS bar chart), grand total (large, tabular nums), advance, „Do wypłaty / Do zwrotu” (to be paid / to be returned).
2. **Form state** (inspector): live pills valid / pending / dirty / touched / submitting, the `errorSummary()` list — click → `focusBoundControl()`.
3. A collapsible `model()` preview as JSON (`<pre>`, mono, max-height with scroll).

### Actions (bottom of the form)
- Primary „Wyślij do akceptacji” (Send for approval) → `[disabled]="claimForm().submitting()"`, text „Wysyłanie…” + spinner.
- Secondary „Zapisz szkic” (Save draft) → `submit(..., { ignoreValidators: 'all' })` → localStorage → toast „Szkic zapisany”.
- Text button „Wyczyść” (Clear) → `reset(emptyClaim())` with confirmation.
- On start: if a draft exists → banner „Masz zapisany szkic z <data>. Wczytaj / Odrzuć” (You have a draft from <date>. Load / Discard) (`model.set`).
- A „Wypełnij przykładowymi danymi” (Fill with sample data) link for demos — inserts a valid set with 3 expenses.

### Success screen
A card with an illustration (simple SVG — a check in a circle), the claim number, a summary, and a „Nowe rozliczenie” (New claim) button.

### Design system (`src/styles/`)
**Light theme only** (`color-scheme: light`). CSS tokens on `:root`:

```css
--bg: #F7F6F2;          /* warm off-white */
--surface: #FFFFFF;
--surface-muted: #FBFAF7;
--border: #E7E4DC;
--ink: #1C1F23;
--ink-muted: #5E636B;
--ink-subtle: #8A8F96;
--accent: #0F766E;      /* deep teal */
--accent-hover: #0B5F58;
--accent-soft: #E6F3F1;
--danger: #B42318;  --danger-soft: #FEF3F2;
--warning: #B54708; --warning-soft: #FFFAEB;
--success: #067647; --success-soft: #ECFDF3;
--radius-sm: 8px; --radius: 12px; --radius-lg: 16px;
--shadow: 0 1px 2px rgb(28 31 35 / .04), 0 4px 16px rgb(28 31 35 / .04);
--focus: 0 0 0 3px rgb(15 118 110 / .25);
```

- Font: **Geist** + **Geist Mono** (Google Fonts), body 15 px / 1.55, `font-variant-numeric: tabular-nums` for amounts.
- Inputs: 40 px tall, 1px `--border`, darker on hover, focus `--focus` + accent border; `.is-invalid` → danger border + a subtle `--danger-soft` background; `.is-pending` → spinner in the right corner.
- API badge: mono 11 px, `--accent-soft` background, accent colour, rounded.
- Spacing on a 4 px scale. No shadows on inputs, a soft shadow on cards only.
- Accessibility: AA contrast, visible focus, labels, `aria-live="polite"` for toasts and the cost-center status.

---

## 8. Project structure

```
src/
  app/
    app.config.ts            # provideHttpClient, provideSignalFormsConfig
    app.ts                   # shell (header + ClaimPage)
    core/
      mock-api.interceptor.ts
      draft-storage.service.ts
      cost-center.types.ts
    claim/
      claim.model.ts
      claim.config.ts        # rates, exchange rates, countries, categories (label + icon)
      claim.metadata.ts      # HELP_TEXT, API_BADGE
      claim-form.ts          # buildClaimForm(model, strictPolicy) — all the form() logic
      schemas/
        address.schema.ts
        expense.schema.ts
        trip.zod.ts
      claim-page.component.ts
      sections/
        employee-section.component.ts
        trip-section.component.ts
        expenses-section.component.ts
        expense-row.component.ts
        extras-section.component.ts
        payout-section.component.ts
        approval-section.component.ts
      sidebar/
        summary-panel.component.ts
        form-inspector.component.ts
      success/
        success-card.component.ts
    ui/
      controls/  money-input, category-picker, switch
      field/     field, field-errors
      button, card, toast, icon
  styles/
    tokens.css, base.css, forms.css
```

Extract `buildClaimForm()` into a separate function (called in an injection context) so it can be tested without a component.

---

## 9. Tests (Vitest — Angular's default runner)

Script `"test:ci": "ng test --watch=false"`.

Minimum:
- `address.schema.spec.ts` — postal code required only for PL.
- `claim-form.spec.ts` — endDate < startDate gives an error; `receiptNo` required when amount > 100 and gone when ≤ 100; changing `strictPolicy` changes the validity of `purpose`; `validateTree` attaches the error to `payout.advance`; the `km` field is hidden for `meal`; an empty expense list → error.
- `money-input.spec.ts` — parse "1 234,50" → 1234.5; "abc" → parse error, model unchanged; `reset` clears the parse error.
- `category-picker.spec.ts` — arrow keys change the value.
- `mock-api.interceptor.spec.ts` — MPK-9999 inactive, unknown → 404.
- Async: a `validateHttp` test with `HttpTestingController` (pending → valid).

---

## 10. CI, README, metadata

- File `.github/workflows/deploy.yml` — **use the provided file unchanged** (unless the directory name in `dist/` differs — then fix the path).
- `README.md` — **use the provided one**; fill in the feature table with real file paths if they differ, and the "API notes" section.
- `.nvmrc` with the Node version required by Angular 22 (check `ng version` / engines in `@angular/core`).
- `LICENSE` (MIT), `.editorconfig`, Prettier, ESLint (`ng add @angular-eslint/schematics`), a `lint` script.
- `index.html`: `<title>Delegat — Signal Forms demo</title>`, meta description, SVG favicon (a simple "D" mark in the accent colour).
- Take a screenshot (`docs/screenshot.png`, 1440×900) if you can run a browser; otherwise leave a placeholder.

---

## 11. Acceptance criteria

- [ ] `npm ci && npm run lint && npm run test:ci && npm run build` passes locally and in CI.
- [ ] All 27 items from section 3 are present, each with a `// [SF]` comment.
- [ ] Changing an expense category immediately shows/hides the right fields and validations.
- [ ] Changing the department loads and renders the dynamic fields from the mock.
- [ ] Submitting while the cost center is pending waits (`ignoreValidators: 'none'`); on errors, focus goes to the first invalid field (custom controls included).
- [ ] „duplikat” in the trip purpose → server error under the `purpose` field.
- [ ] The draft saves with errors and loads after a refresh.
- [ ] No console errors; Lighthouse Accessibility ≥ 95.
- [ ] Look: light, calm, consistent with the tokens; responsive from 360 px.
- [ ] Zero `any`, zero `ControlValueAccessor`, zero `ReactiveFormsModule`.
