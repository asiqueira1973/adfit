import { describe, expect, it } from "vitest";
import { APP_NAME } from "./constants";

describe("APP_NAME", () => {
  it("usa o nome provisório da assunção A-1", () => {
    expect(APP_NAME).toBe("AdFit");
  });
});
