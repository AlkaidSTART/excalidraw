import { isTauri } from "@tauri-apps/api/core";

import { setHostFileSaver } from "@excalidraw/excalidraw/data/filesystem";

const EXTERNAL_PROTOCOLS = /^(https?|mailto|tel):/i;

export const isRunningInTauri = () => isTauri();

/**
 * Wires the editor into the native shell:
 * - saves files through the system save dialog (browser downloads don't work
 *   inside the Tauri webview)
 * - opens external links in the system browser instead of navigating away
 */
export const installTauriIntegrations = async () => {
  if (!isRunningInTauri()) {
    return;
  }

  const [{ save }, { writeFile }, { openUrl }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
    import("@tauri-apps/plugin-opener"),
  ]);

  setHostFileSaver(async (blob, opts) => {
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

  const openExternal = (url: string) => {
    void openUrl(url).catch((error) => {
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
