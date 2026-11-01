export interface CostCenterResponse {
  active: boolean;
  name: string;
}

export interface DepartmentFieldConfig {
  key: string;
  label: string;
  kind: 'text' | 'number';
  required: boolean;
  hint: string;
}

export interface ClaimCreatedResponse {
  id: string;
}

export interface ServerFieldError {
  field: string;
  message: string;
}

export function isCostCenterResponse(value: unknown): value is CostCenterResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CostCenterResponse).active === 'boolean' &&
    typeof (value as CostCenterResponse).name === 'string'
  );
}
