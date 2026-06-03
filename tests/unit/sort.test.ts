import { describe, it, expect } from "vitest";
import { getSafeSortColumn, getSafeSortOrder } from "../../src/lib/sort.js";
import { ValidationError } from "../../src/errors/app-error.js";

describe("Unit: Dynamic Sorting Allowlist Safeguards", () => {
  const allowedSortColumns = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    title: "title",
    status: "status",
  } as const;

  it("should return the default column when requested field is undefined", () => {
    const col = getSafeSortColumn(undefined, allowedSortColumns, "createdAt");
    expect(col).toBe("created_at");
  });

  it("should return mapped database column for valid allowlisted fields", () => {
    expect(getSafeSortColumn("title", allowedSortColumns, "createdAt")).toBe("title");
    expect(getSafeSortColumn("updatedAt", allowedSortColumns, "createdAt")).toBe("updated_at");
    expect(getSafeSortColumn("status", allowedSortColumns, "createdAt")).toBe("status");
  });

  it("should reject malicious or unallowlisted sort fields with ValidationError", () => {
    expect(() =>
      getSafeSortColumn("password_hash", allowedSortColumns, "createdAt")
    ).toThrow(ValidationError);

    expect(() =>
      getSafeSortColumn("title; DROP TABLE users; --", allowedSortColumns, "createdAt")
    ).toThrow(ValidationError);

    expect(() =>
      getSafeSortColumn("(SELECT version())", allowedSortColumns, "createdAt")
    ).toThrow(ValidationError);
  });

  it("should safely validate sort order", () => {
    expect(getSafeSortOrder(undefined, "desc")).toBe("desc");
    expect(getSafeSortOrder("asc", "desc")).toBe("asc");
    expect(getSafeSortOrder("ASC", "desc")).toBe("asc");
    expect(getSafeSortOrder("desc", "asc")).toBe("desc");

    expect(() => getSafeSortOrder("invalid_direction")).toThrow(ValidationError);
    expect(() => getSafeSortOrder("asc; SELECT 1")).toThrow(ValidationError);
  });
});

