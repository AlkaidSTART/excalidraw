import { useCallback, useEffect, useRef, useState } from "react";

import {
  compareVersions,
  fetchLatestRelease,
  getClientVersion,
} from "../version";

import type { VersionUpdate } from "../version";

const VERSION_CHECK_STORAGE_KEY = "excalidraw-version-check";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 10_000;

export type VersionCheckState = {
  lastCheckedAt: number;
  latestVersion: string;
  latestUrl: string;
  latestNotes?: string;
  dismissedVersion: string | null;
};

const DEFAULT_STATE: VersionCheckState = {
  lastCheckedAt: 0,
  latestVersion: "",
  latestUrl: "",
  latestNotes: undefined,
  dismissedVersion: null,
};

const readState = (): VersionCheckState => {
  try {
    const raw = localStorage.getItem(VERSION_CHECK_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_STATE };
    }

    return {
      lastCheckedAt:
        typeof parsed.lastCheckedAt === "number" ? parsed.lastCheckedAt : 0,
      latestVersion:
        typeof parsed.latestVersion === "string" ? parsed.latestVersion : "",
      latestUrl: typeof parsed.latestUrl === "string" ? parsed.latestUrl : "",
      latestNotes:
        typeof parsed.latestNotes === "string" ? parsed.latestNotes : undefined,
      dismissedVersion:
        typeof parsed.dismissedVersion === "string"
          ? parsed.dismissedVersion
          : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const writeState = (state: VersionCheckState) => {
  try {
    localStorage.setItem(VERSION_CHECK_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to record the version check result", error);
  }
};

const recordedUpdate = (state: VersionCheckState): VersionUpdate | null =>
  state.latestVersion && state.latestUrl
    ? {
        version: state.latestVersion,
        url: state.latestUrl,
        notes: state.latestNotes,
      }
    : null;

export const useVersionCheck = () => {
  const [update, setUpdate] = useState<VersionUpdate | null>(null);
  const [clientVersion, setClientVersion] = useState<string | null>(null);
  const checkingRef = useRef(false);

  const applyUpdate = useCallback(
    (
      latest: VersionUpdate | null,
      client: string,
      dismissedVersion: string | null,
    ) => {
      if (
        latest &&
        latest.version !== dismissedVersion &&
        compareVersions(latest.version, client) > 0
      ) {
        setUpdate(latest);
      } else {
        setUpdate(null);
      }
    },
    [],
  );

  const check = useCallback(
    async (force = false) => {
      if (checkingRef.current) {
        return;
      }
      checkingRef.current = true;

      try {
        const recorded = readState();
        const client = await getClientVersion();
        setClientVersion(client);

        // Show what we recorded on the previous run immediately, even offline.
        applyUpdate(
          recordedUpdate(recorded),
          client,
          recorded.dismissedVersion,
        );

        if (!force && Date.now() - recorded.lastCheckedAt < CHECK_INTERVAL_MS) {
          return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(
          () => controller.abort(),
          FETCH_TIMEOUT_MS,
        );

        try {
          const latest = await fetchLatestRelease({
            signal: controller.signal,
          });
          if (!latest) {
            return;
          }

          writeState({
            ...recorded,
            lastCheckedAt: Date.now(),
            latestVersion: latest.version,
            latestUrl: latest.url,
            latestNotes: latest.notes,
          });
          applyUpdate(latest, client, recorded.dismissedVersion);
        } finally {
          window.clearTimeout(timeout);
        }
      } catch (error) {
        // A version check must never interrupt the app.
        if ((error as Error)?.name !== "AbortError") {
          console.warn("Failed to check for app updates", error);
        }
      } finally {
        checkingRef.current = false;
      }
    },
    [applyUpdate],
  );

  useEffect(() => {
    // Optimistic: let the first screen paint before touching the network.
    const timer = window.setTimeout(() => void check(), INITIAL_CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [check]);

  const dismiss = useCallback(() => {
    setUpdate((current) => {
      if (!current) {
        return current;
      }

      const recorded = readState();
      writeState({
        ...recorded,
        lastCheckedAt: recorded.lastCheckedAt,
        latestVersion: current.version,
        latestUrl: current.url,
        latestNotes: current.notes,
        dismissedVersion: current.version,
      });
      return null;
    });
  }, []);

  const openUpdate = useCallback(() => {
    if (update?.url) {
      window.open(update.url, "_blank", "noopener,noreferrer");
    }
  }, [update]);

  return { update, clientVersion, dismiss, openUpdate };
};
