export type ToolBirthPrefill = {
  displayName?: string;
  day?: string;
  month?: string;
  year?: string;
};

export type ToolBirthPrefillSearchParams = {
  name?: string | string[];
  birthDay?: string | string[];
  birthMonth?: string | string[];
  birthYear?: string | string[];
};

const MAX_NAME_LENGTH = 60;
const MIN_YEAR = 1900;

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function boundedInteger(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined || !/^\d{1,4}$/.test(value.trim())) return undefined;
  const parsed = Number(value.trim());
  return parsed >= min && parsed <= max ? parsed : undefined;
}

/**
 * Reads birth details that a free tool passes to the wizard in the URL, so the
 * customer is not asked for the same fields twice. Invalid values are dropped
 * one by one; the wizard still validates the final date on submit.
 */
export function parseToolBirthPrefill(
  params: ToolBirthPrefillSearchParams | undefined,
  referenceYear: number,
): ToolBirthPrefill {
  if (params === undefined) return {};
  const prefill: ToolBirthPrefill = {};

  const name = single(params.name)?.trim().replace(/\s+/g, " ");
  if (name !== undefined && name.length > 0 && name.length <= MAX_NAME_LENGTH) {
    prefill.displayName = name;
  }

  const day = boundedInteger(single(params.birthDay), 1, 31);
  const month = boundedInteger(single(params.birthMonth), 1, 12);
  const year = boundedInteger(single(params.birthYear), MIN_YEAR, referenceYear);
  if (day !== undefined) prefill.day = String(day).padStart(2, "0");
  if (month !== undefined) prefill.month = String(month).padStart(2, "0");
  if (year !== undefined) prefill.year = String(year);

  return prefill;
}

export function hasToolBirthPrefill(prefill: ToolBirthPrefill | undefined): prefill is ToolBirthPrefill {
  return prefill !== undefined && Object.keys(prefill).length > 0;
}
