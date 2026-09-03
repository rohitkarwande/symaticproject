export interface ValidationRule {
  field: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  numeric?: boolean;
  integerOnly?: boolean;
  positiveOnly?: boolean;
  min?: number;
  max?: number;
  isDate?: boolean;
  customValidation?: (value: any) => string | null;
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export function validateSingleField<T>(
  field: keyof T,
  value: any,
  rule: ValidationRule
): string | null {
  const strVal = value !== undefined && value !== null ? String(value).trim() : '';

  // Required check
  if (rule.required && !strVal) {
    return `${rule.label} is required.`;
  }

  if (!strVal && !rule.required) {
    return null; // optional & empty is valid
  }

  // Min length
  if (rule.minLength !== undefined && strVal.length < rule.minLength) {
    return `${rule.label} must be at least ${rule.minLength} characters long.`;
  }

  // Max length
  if (rule.maxLength !== undefined && strVal.length > rule.maxLength) {
    return `${rule.label} cannot exceed ${rule.maxLength} characters.`;
  }

  // Date validation
  if (rule.isDate) {
    const parsedDate = Date.parse(strVal);
    if (isNaN(parsedDate)) {
      return `${rule.label} must be a valid date (YYYY-MM-DD).`;
    }
  }

  // Numeric check
  if (rule.numeric) {
    const num = Number(strVal);
    if (isNaN(num)) {
      return `${rule.label} must be a valid number.`;
    }

    if (rule.integerOnly && !Number.isInteger(num)) {
      return `${rule.label} must be a whole integer.`;
    }

    if (rule.positiveOnly && num <= 0) {
      return `${rule.label} must be a positive number greater than 0.`;
    }

    if (rule.min !== undefined && num < rule.min) {
      return `${rule.label} must be at least ${rule.min}.`;
    }

    if (rule.max !== undefined && num > rule.max) {
      return `${rule.label} must be between ${rule.min ?? 0} and ${rule.max}.`;
    }
  }

  // Custom validation callback
  if (rule.customValidation) {
    return rule.customValidation(value);
  }

  return null;
}

export function validateFormGroup<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, ValidationRule>
): { isValid: boolean; errors: ValidationErrors<T> } {
  const errors: ValidationErrors<T> = {};
  let isValid = true;

  for (const key in rules) {
    if (Object.prototype.hasOwnProperty.call(rules, key)) {
      const rule = rules[key];
      const error = validateSingleField(key, data[key], rule);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    }
  }

  return { isValid, errors };
}
