import {
  Excalidraw,
  ExcalidrawAPIProvider,
  TTDDialog,
  TTDDialogTrigger,
  useExcalidrawAPI,
  useHandleLibrary,
} from "@excalidraw/excalidraw";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@excalidraw/excalidraw/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import { isElementLink } from "@excalidraw/element";
import { useCallback, useState } from "react";

import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";

import { AppMainMenu } from "../components/AppMainMenu";
import { AppWelcomeScreen } from "../components/AppWelcomeScreen";
import { TopErrorBoundary } from "../components/TopErrorBoundary";
import { FileStatusStore } from "../data/fileStatusStore";
import { useDocumentSession } from "../hooks/useDocumentSession";
import { useAppLangCode } from "../app-language/language-state";
import { LibrarySqliteAdapter } from "../storage/LibrarySqliteAdapter";
import { isTauriMobile } from "../tauri";
import { useHandleAppTheme } from "../useHandleAppTheme";

import type { DocumentStore } from "../storage/types";

const ExcalidrawWrapper = ({
  store,
  docId,
  onBack,
}: {
  store: DocumentStore;
  docId: string;
  onBack: () => void;
}) => {
  const excalidrawAPI = useExcalidrawAPI();
  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();
  const [langCode] = useAppLangCode();
  const { initialData, loading, onChange, flush } = useDocumentSession(
    docId,
    store,
  );
  const [errorMessage, setErrorMessage] = useState("");

  useHandleLibrary({
    excalidrawAPI,
    adapter: LibrarySqliteAdapter,
  });

  const handleBack = useCallback(async () => {
    await flush();
    onBack();
  }, [flush, onBack]);

  const onExport: Required<ExcalidrawProps>["onExport"] = useCallback(
    async function* () {
      let snapshot = FileStatusStore.getSnapshot();
      const { pending, total } = FileStatusStore.getPendingCount(
        snapshot.value,
      );
      if (pending === 0) {
        return;
      }

      yield {
        type: "progress",
        progress: (total - pending) / total,
        message: `Loading images (${total - pending}/${total})...`,
      };

      while (true) {
        snapshot = await FileStatusStore.pull(snapshot.version);
        const { pending: nowPending, total: nowTotal } =
          FileStatusStore.getPendingCount(snapshot.value);

        yield {
          type: "progress",
          progress: (nowTotal - nowPending) / nowTotal,
          message: `Loading images (${nowTotal - nowPending}/${nowTotal})...`,
        };

        if (nowPending === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          yield { type: "progress", message: "Preparing export..." };
          return;
        }
      }
    },
    [],
  );

  if (loading) {
    return <div className="app-bootstrap">Opening drawing…</div>;
  }

  return (
    <div style={{ height: "100%" }} className="excalidraw-app">
      <Excalidraw
        initialData={initialData}
        onChange={onChange}
        onExport={onExport}
        langCode={langCode}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        onThemeChange={setAppTheme}
        UIOptions={
          isTauriMobile()
            ? {
                getFormFactor: (width, height) =>
                  width >= 900 && height >= 600 ? "tablet" : "phone",
              }
            : {}
        }
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            excalidrawAPI?.setViewport({
              target: element.link,
              fit: "scale-down",
              animation: true,
            });
          }
        }}
      >
        <AppMainMenu
          theme={appTheme}
          onNavigateHome={handleBack}
          onSave={handleBack}
        />
        <AppWelcomeScreen />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
        </OverwriteConfirmDialog>
        <TTDDialog __fallback />
        <TTDDialogTrigger tab="mermaid" />

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: "Back to documents",
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              keywords: ["home", "library", "files", "drawings", "close"],
              perform: () => void handleBack(),
            },
            {
              label: "Save now",
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              keywords: ["save", "flush", "persist"],
              perform: () => void flush(),
            },
          ]}
        />

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}
      </Excalidraw>
    </div>
  );
};

export const EditorScreen = ({
  store,
  docId,
  onBack,
}: {
  store: DocumentStore;
  docId: string;
  onBack: () => void;
}) => {
  return (
    <TopErrorBoundary>
      <ExcalidrawAPIProvider>
        <ExcalidrawWrapper store={store} docId={docId} onBack={onBack} />
      </ExcalidrawAPIProvider>
    </TopErrorBoundary>
  );
};
