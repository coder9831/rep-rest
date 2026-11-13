import { describe, it, expect } from "vitest";
import { epley, nameKey, bodyweightDue, volume } from "./training";

describe("training rules", () => {
  it("Epley 1RM = weight × (1 + reps/30)", () => {
    expect(epley(180, 10)).toBeCloseTo(240);
  });
  it("matches exercise names regardless of case/spacing", () => {
    expect(nameKey("  Bench   Press")).toBe(nameKey("bench press"));
  });
  it("volume = weight × reps", () => {
    expect(volume(185, 8)).toBe(1480);
  });
  it("bodyweight reminder after a month", () => {
    expect(bodyweightDue("2026-01-01", new Date("2026-01-20T12:00:00"))).toBe(false);
    expect(bodyweightDue("2026-01-01", new Date("2026-02-01T12:00:00"))).toBe(true);
    expect(bodyweightDue(null)).toBe(true);
  });
});
