import { describe, expect, it } from "vitest";

import {
  compareVersions,
  isVersionNewer,
  normalizeVersion,
  parseRelease,
} from "../version";

describe("normalizeVersion", () => {
  it("strips the v prefix, build metadata, and whitespace", () => {
    expect(normalizeVersion(" v1.2.3+build.7 ")).toBe("1.2.3");
  });
});

describe("compareVersions", () => {
  const cases: Array<[string, string, number]> = [
    ["1.2.3", "1.2.4", -1],
    ["1.10.0", "1.9.9", 1],
    ["v2.0.0", "2.0.0", 0],
    ["2.0.0", "2.0.0-beta.2", 1],
    ["2.0.0-beta.2", "2.0.0-beta.11", -1],
    ["2.0.0-alpha", "2.0.0-alpha.1", -1],
    ["1.0", "1.0.0", 0],
  ];

  it.each(cases)("compares %s with %s", (left, right, expected) => {
    expect(compareVersions(left, right)).toBe(expected);
    expect(compareVersions(right, left)).toBe(expected === 0 ? 0 : -expected);
  });

  it("detects when a release is newer than the client", () => {
    expect(isVersionNewer("0.2.0", "0.1.0")).toBe(true);
    expect(isVersionNewer("0.1.0", "0.1.0")).toBe(false);
    expect(isVersionNewer("0.0.9", "0.1.0")).toBe(false);
  });
});

describe("parseRelease", () => {
  it("maps a GitHub release to an update", () => {
    expect(
      parseRelease({
        tag_name: "v0.2.0",
        html_url:
          "https://github.com/AlkaidSTART/excalidraw/releases/tag/v0.2.0",
        body: "  Fixes and improvements  ",
        published_at: "2026-01-01T00:00:00Z",
      }),
    ).toEqual({
      version: "0.2.0",
      url: "https://github.com/AlkaidSTART/excalidraw/releases/tag/v0.2.0",
      notes: "Fixes and improvements",
      publishedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("ignores drafts and releases without a tag", () => {
    expect(parseRelease({ draft: true, tag_name: "v9.9.9" })).toBeNull();
    expect(parseRelease({ tag_name: "" })).toBeNull();
    expect(parseRelease(null)).toBeNull();
  });

  it("falls back to the releases page when html_url is missing", () => {
    expect(
      parseRelease({ tag_name: "v1.0.0" }, "https://example.com/releases"),
    ).toMatchObject({ url: "https://example.com/releases" });
  });
});
