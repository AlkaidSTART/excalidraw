import {
  DuplicateIcon,
  exportToFileIcon,
  TrashIcon,
} from "@excalidraw/excalidraw/components/icons";

import { Button } from "../components/Button";

import type { DocumentMeta } from "../storage/types";

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const DocumentCard = ({
  document,
  thumbnailUrl,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
}: {
  document: DocumentMeta;
  thumbnailUrl?: string;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
}) => {
  return (
    <article className="flex flex-col overflow-hidden rounded-[0.8rem] border border-app-border bg-app-surface">
      <button
        type="button"
        className="relative flex aspect-[16/10] cursor-pointer items-center justify-center border-b border-app-border bg-app-surface-muted p-0 text-app-text-muted"
        onClick={onOpen}
        aria-label={`Open ${document.name}`}
      >
        {thumbnailUrl ? (
          <img
            className="h-full w-full object-cover"
            src={thumbnailUrl}
            alt=""
          />
        ) : (
          <span className="text-base font-semibold tracking-[0.02em] opacity-60">
            Excalidraw
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-col gap-[0.2rem] px-3.5 pb-1.5 pt-3">
        <button
          type="button"
          className="cursor-pointer truncate border-0 bg-transparent p-0 text-left text-base font-semibold text-app-text"
          onClick={onOpen}
        >
          {document.name}
        </button>
        <span className="text-[0.8rem] text-app-text-muted">
          {formatDate(document.updatedAt)}
        </span>
      </div>
      <div className="flex gap-1 px-2.5 pb-3 pt-1.5">
        <Button variant="ghost" onClick={onRename} title="Rename">
          Rename
        </Button>
        <Button variant="ghost" onClick={onDuplicate} title="Duplicate">
          {DuplicateIcon}
        </Button>
        <Button variant="ghost" onClick={onExport} title="Export">
          {exportToFileIcon}
        </Button>
        <Button variant="ghost-danger" onClick={onDelete} title="Delete">
          {TrashIcon}
        </Button>
      </div>
    </article>
  );
};
