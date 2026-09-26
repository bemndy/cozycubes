import { describe, expect, it } from "vitest";
import { hasUnseenRelease, LATEST_RELEASE_TAG } from "./changelog";

describe("hasUnseenRelease", () => {
  it("is quiet on a first visit", () => {
    expect(hasUnseenRelease(null, "v1.0-beta")).toBe(false);
  });

  it("is quiet when the visitor has read the current release", () => {
    expect(hasUnseenRelease("v1.0-beta", "v1.0-beta")).toBe(false);
  });

  it("flags a release the visitor has not read", () => {
    expect(hasUnseenRelease("v0.3.0", "v1.0-beta")).toBe(true);
  });

  it("flags a rollback too — any difference is unread", () => {
    expect(hasUnseenRelease("v1.0-beta", "v0.3.0")).toBe(true);
  });
});

describe("LATEST_RELEASE_TAG", () => {
  it("is the newest tag in the release history", () => {
    expect(LATEST_RELEASE_TAG).toBe("v1.0-beta");
  });
});
