import { describe, expect, it } from "vitest";
import {
  escapeCsv,
  escapeHtml,
  safeFilename,
} from "../../src/app/features/reports/services/formatting";

describe("report formatting", () => {
  it("escapes CSV cells without changing simple values", () => {
    expect(escapeCsv("Plain value")).toBe("Plain value");
    expect(escapeCsv('A "quoted", value')).toBe('"A ""quoted"", value"');
  });

  it("escapes report HTML and creates safe dated filenames", () => {
    expect(escapeHtml("<b>A & B</b>")).toBe("&lt;b&gt;A &amp; B&lt;/b&gt;");
    expect(safeFilename("My / Report!", "csv")).toMatch(/^my-report-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
