import { isTauri } from "@tauri-apps/api/core";

import {
  setHostFileOpener,
  setHostFileSaver,
} from "@excalidraw/excalidraw/data/filesystem";

const EXTERNAL_PROTOCOLS = /^(https?|mailto|tel):/i;

export const isRunningInTauri = () => isTauri();

export const isTauriMobile = () => {
  if (!isRunningInTauri()) {
    return false;
  }

  const userAgent = navigator.userAgent;
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent))
  );
};

export const listenForOpenFile = async (
  onOpenFile: (paths: string[]) => void,
) => {
  if (!isRunningInTauri()) {
    return () => {};
  }

  const { listen } = await import("@tauri-apps/api/event");
  return listen<string[]>("open-file", (event) => {
    onOpenFile(event.payload);
  });
};

/**
 * Wires the editor into the native shell:
 * - saves files through the system save dialog
 * - opens files through the system open dialog
 * - opens external links in the system browser instead of navigating away
 *
 * The Tauri plugins are imported lazily so they only load in the native shell.
 */
export const installTauriIntegrations = () => {
  if (!isRunningInTauri()) {
    return;
  }

  setHostFileSaver(async (blob, opts) => {
    const [{ save }, { writeFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);

    const path = await save({
      defaultPath: `${opts.name}.${opts.extension}`,
      filters: [{ name: opts.description, extensions: [opts.extension] }],
    });

    if (!path) {
      return null;
    }

    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    // the webview has no persistent FileSystemFileHandle to hand back
    return null;
  });

  setHostFileOpener(async (opts) => {
    const [{ open }, { readFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);

    const extensions = opts.extensions?.flatMap((extension) =>
      extension === "jpg" ? ["jpg", "jpeg"] : [extension],
    );

    const selected = await open({
      multiple: opts.multiple ?? false,
      directory: false,
      filters: extensions?.length
        ? [{ name: opts.description, extensions }]
        : undefined,
    });

    if (!selected) {
      return null;
    }

    const paths = Array.isArray(selected) ? selected : [selected];
    const files = await Promise.all(
      paths.map(async (path) => {
        const bytes = await readFile(path);
        const name = path.split(/[\\/]/).pop() || "file";
        return new File([bytes], name, { type: "" });
      }),
    );

    return opts.multiple ? files : files[0];
  });

  const openExternal = (url: string) => {
    void import("@tauri-apps/plugin-opener")
      .then(({ openUrl }) => openUrl(url))
      .catch((error) => {
        console.error("Failed to open external URL", error);
      });
  };

  document.addEventListener(
    "click",
    (event) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      const href = anchor?.getAttribute("href");

      if (!href || !EXTERNAL_PROTOCOLS.test(href)) {
        return;
      }

      const url = new URL(href, window.location.href);
      if (url.origin === window.location.origin) {
        return;
      }

      event.preventDefault();
      openExternal(url.toString());
    },
    true,
  );

  const originalWindowOpen = window.open.bind(window);
  window.open = (url?: string | URL, target?: string, features?: string) => {
    const href = typeof url === "string" ? url : url?.toString();

    if (href && EXTERNAL_PROTOCOLS.test(href)) {
      openExternal(href);
      return null;
    }

    return originalWindowOpen(url, target, features);
  };
};
