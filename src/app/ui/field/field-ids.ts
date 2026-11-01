/** Turns a Signal Forms field name (e.g. `claim.expenses.0.amount`) into a DOM id. */
export function fieldId(name: string): string {
  return 'f-' + name.replace(/[^\w-]+/g, '-');
}

export const errorsId = (name: string) => fieldId(name) + '-errors';
export const hintId = (name: string) => fieldId(name) + '-hint';
export const labelId = (name: string) => fieldId(name) + '-label';
