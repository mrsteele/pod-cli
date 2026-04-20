/**
 * Variable normalization utilities
 *
 * The Promptodex API returns prompt variables either as strings (legacy
 * format) or as structured objects of the form
 * `{ name, defaultValue?, required? }`. This module normalizes both
 * shapes into a single representation so skill/collection tooling can
 * reason about required vs optional variables consistently.
 */

export type ApiVariable =
  | string
  | {
      name: string;
      defaultValue?: string | null;
      required?: boolean;
    };

export interface PromptVariable {
  name: string;
  defaultValue?: string;
  required: boolean;
}

/**
 * Normalize a list of API variables into `PromptVariable[]`.
 *
 * Strings are treated as required variables with no default. Objects
 * keep their `defaultValue`/`required` fields when provided; unknown
 * entries are dropped.
 */
export function normalizeVariables(variables: unknown): PromptVariable[] {
  if (!Array.isArray(variables)) {
    return [];
  }

  const normalized: PromptVariable[] = [];

  for (const entry of variables) {
    if (typeof entry === 'string') {
      const name = entry.trim();
      if (name) {
        normalized.push({ name, required: true });
      }
      continue;
    }

    if (entry && typeof entry === 'object' && 'name' in entry) {
      const raw = entry as { name: unknown; defaultValue?: unknown; required?: unknown };
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name) continue;

      const defaultValue =
        typeof raw.defaultValue === 'string' ? raw.defaultValue : undefined;
      const required =
        typeof raw.required === 'boolean' ? raw.required : defaultValue === undefined;

      normalized.push({ name, defaultValue, required });
    }
  }

  return normalized;
}

export interface VariableReport {
  provided: Record<string, string>;
  missingRequired: PromptVariable[];
  missingOptional: PromptVariable[];
}

/**
 * Compare a set of provided values against a prompt's declared
 * variables. Missing variables that have a `defaultValue` are filled
 * in automatically and therefore do not appear in either "missing"
 * bucket.
 */
export function analyzeVariables(
  declared: PromptVariable[],
  provided: Record<string, string>
): VariableReport {
  const merged: Record<string, string> = { ...provided };
  const missingRequired: PromptVariable[] = [];
  const missingOptional: PromptVariable[] = [];

  for (const variable of declared) {
    if (variable.name in merged) continue;

    if (variable.defaultValue !== undefined) {
      merged[variable.name] = variable.defaultValue;
      continue;
    }

    if (variable.required) {
      missingRequired.push(variable);
    } else {
      missingOptional.push(variable);
    }
  }

  return {
    provided: merged,
    missingRequired,
    missingOptional
  };
}
