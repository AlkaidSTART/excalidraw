import { isRunningInTauri } from "./tauri";

export const DEFAULT_UPDATE_REPO = "AlkaidSTART/excalidraw";

export const getUpdateRepo = () =>
  import.meta.env.VITE_APP_UPDATE_REPO?.trim() || DEFAULT_UPDATE_REPO;

export const getLatestReleaseUrl = (repo = getUpdateRepo()) =>
  `https://api.github.com/repos/${repo}/releases/latest`;

export const getReleasesPageUrl = (repo = getUpdateRepo()) =>
  `https://github.com/${repo}/releases/latest`;

export type VersionUpdate = {
  version: string;
  url: string;
  notes?: string;
  publishedAt?: string;
};

export type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  body?: string | null;
  published_at?: string;
  draft?: boolean;
};

const parseVersion = (version: string) => {
  const normalized = normalizeVersion(version);
  const dashIndex = normalized.indexOf("-");
  const core = dashIndex === -1 ? normalized : normalized.slice(0, dashIndex);
  const prerelease = dashIndex === -1 ? "" : normalized.slice(dashIndex + 1);

  return {
    core: core.split(".").map((part) => {
      const value = Number.parseInt(part, 10);
      return Number.isNaN(value) ? 0 : value;
    }),
    prerelease: prerelease ? prerelease.split(".") : [],
  };
};

const comparePrerelease = (left: string[], right: string[]) => {
  if (!left.length && right.length) {
    return 1;
  }
  if (left.length && !right.length) {
    return -1;
  }

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const leftPart = left[index];
    const rightPart = right[index];

    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }

    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;

    if (leftNumber !== null && rightNumber !== null) {
      if (leftNumber !== rightNumber) {
        return leftNumber > rightNumber ? 1 : -1;
      }
      continue;
    }

    if (leftNumber !== null) {
      return -1;
    }
    if (rightNumber !== null) {
      return 1;
    }

    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  return 0;
};

export const normalizeVersion = (version: string) =>
  version.trim().replace(/^v/i, "").split("+")[0].trim();

/**
 * Compares two semantic-ish versions. Returns 1 when `left` is newer, -1 when
 * `right` is newer, and 0 when they match.
 */
export const compareVersions = (left: string, right: string) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.core.length, b.core.length);

  for (let index = 0; index < length; index++) {
    const difference = (a.core[index] ?? 0) - (b.core[index] ?? 0);
    if (difference !== 0) {
      return difference > 0 ? 1 : -1;
    }
  }

  return comparePrerelease(a.prerelease, b.prerelease);
};

export const isVersionNewer = (candidate: string, current: string) =>
  compareVersions(candidate, current) > 0;

export const parseRelease = (
  release: GitHubRelease | null | undefined,
  fallbackUrl = getReleasesPageUrl(),
): VersionUpdate | null => {
  if (!release || release.draft) {
    return null;
  }

  const tag = release.tag_name?.trim();
  if (!tag) {
    return null;
  }

  return {
    version: normalizeVersion(tag),
    url: release.html_url?.trim() || fallbackUrl,
    notes: release.body?.trim() || undefined,
    publishedAt: release.published_at || undefined,
  };
};

export const fetchLatestRelease = async ({
  signal,
  repo,
}: {
  signal?: AbortSignal;
  repo?: string;
} = {}): Promise<VersionUpdate | null> => {
  const response = await fetch(getLatestReleaseUrl(repo), {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Version check failed with HTTP ${response.status}`);
  }

  return parseRelease(
    (await response.json()) as GitHubRelease,
    getReleasesPageUrl(repo),
  );
};

const resolveClientVersion = async (): Promise<string> => {
  const bundledVersion =
    typeof __APP_VERSION__ === "string" ? __APP_VERSION__.trim() : "";
  if (bundledVersion) {
    return bundledVersion;
  }

  if (isRunningInTauri()) {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      return await getVersion();
    } catch (error) {
      console.warn("Failed to read the native app version", error);
    }
  }

  return "0.0.0";
};

let clientVersionPromise: Promise<string> | null = null;

export const getClientVersion = () => {
  clientVersionPromise ??= resolveClientVersion();
  return clientVersionPromise;
};
