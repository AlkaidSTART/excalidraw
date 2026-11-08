import { getDefaultAppState } from "@excalidraw/excalidraw/appState";

import { useCallback, useEffect, useState } from "react";

import type { AppState } from "@excalidraw/excalidraw/types";

import { UpdateBanner } from "./components/UpdateBanner";
import { EditorScreen } from "./editor/EditorScreen";
import { DocumentBrowser } from "./home/DocumentBrowser";
import { useAndroidBack } from "./hooks/useAndroidBack";
import { useKeyboardInset } from "./hooks/useKeyboardInset";
import { useVersionCheck } from "./hooks/useVersionCheck";
import { listenForOpenFile } from "./tauri";

import type { DocumentStore } from "./storage/types";

type Route = { name: "home" } | { name: "editor"; docId: string };

const parseHash = (): Route => {
  const match = window.location.hash.match(/^#\/doc\/(.+)$/);
  return match
    ? { name: "editor", docId: decodeURIComponent(match[1]) }
    : { name: "home" };
};

export const Root = ({ store }: { store: DocumentStore }) => {
  const [route, setRoute] = useState<Route>(parseHash);
  const { update, clientVersion, dismiss, openUpdate } = useVersionCheck();

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleBack = useCallback(() => {
    if (route.name === "editor") {
      window.location.hash = "#/";
      return "handled" as const;
    }
    return "exit" as const;
  }, [route.name]);

  useAndroidBack(handleBack);
  useKeyboardInset();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenForOpenFile(async (paths) => {
      if (!paths.length) {
        return;
      }

      try {
        const [{ readFile }, { loadFromBlob }] = await Promise.all([
          import("@tauri-apps/plugin-fs"),
          import("@excalidraw/excalidraw/data/blob"),
        ]);

        const rawPath = paths[0].startsWith("file://")
          ? decodeURIComponent(paths[0].replace(/^file:\/\//, ""))
          : paths[0];
        const bytes = await readFile(rawPath);
        const name = rawPath.split(/[\\/]/).pop() || "Imported";
        const file = new File([bytes], name, { type: "" });
        const data = await loadFromBlob(file, null, null);
        const document = await store.create(
          name.replace(/\.(excalidraw|json)$/i, "") || "Imported",
        );

        await store.saveScene(document.id, data.elements, {
          ...getDefaultAppState(),
          ...data.appState,
        } as AppState);
        await store.saveFiles(document.id, data.files);
        window.location.hash = `#/doc/${encodeURIComponent(document.id)}`;
      } catch (error) {
        console.error("Failed to open file", error);
      }
    }).then((stop) => {
      if (cancelled) {
        stop();
      } else {
        unlisten = stop;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [store]);

  const content =
    route.name === "editor" ? (
      <EditorScreen
        key={route.docId}
        store={store}
        docId={route.docId}
        onBack={() => {
          window.location.hash = "#/";
        }}
      />
    ) : (
      <DocumentBrowser
        store={store}
        onOpen={(documentId) => {
          window.location.hash = `#/doc/${encodeURIComponent(documentId)}`;
        }}
      />
    );

  return (
    <>
      {content}
      <UpdateBanner
        update={update}
        clientVersion={clientVersion}
        onUpdate={openUpdate}
        onDismiss={dismiss}
      />
    </>
  );
};

export default Root;
