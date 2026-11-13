import { ValidationError } from "../errors/app-error.js";

export type SortOrder = "asc" | "desc";

/**
 * Validates and safely resolves an allowable column identifier for SQL ORDER BY clauses.
 * Prevents SQL injection via column name manipulation.
 */
export function getSafeSortColumn<T extends Record<string, string>>(
  requestedField: string | undefined,
  allowlist: T,
  defaultField: keyof T
): string {
  if (!requestedField) {
    const col = allowlist[defaultField];
    if (!col) throw new Error("Invalid default sort column configuration");
    return col;
  }

  if (Object.prototype.hasOwnProperty.call(allowlist, requestedField)) {
    const col = allowlist[requestedField as keyof T];
    if (col) return col;
  }

  throw new ValidationError(
    `Unsupported sort field: '${requestedField}'. Allowed fields: ${Object.keys(allowlist).join(", ")}`
  );
}

/**
 * Validates sort order direction.
 */
export function getSafeSortOrder(direction: string | undefined, defaultOrder: SortOrder = "desc"): SortOrder {
  if (!direction) return defaultOrder;
  const lower = direction.toLowerCase();
  if (lower === "asc" || lower === "desc") {
    return lower;
  }
  throw new ValidationError("Unsupported sort order. Allowed values: 'asc', 'desc'");
}
