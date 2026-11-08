import {
  DuplicateIcon,
  exportToFileIcon,
  TrashIcon,
} from "@excalidraw/excalidraw/components/icons";

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
    <article className="app-document-card">
      <button
        type="button"
        className="app-document-card__preview"
        onClick={onOpen}
        aria-label={`Open ${document.name}`}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" />
        ) : (
          <span className="app-document-card__placeholder">Excalidraw</span>
        )}
      </button>
      <div className="app-document-card__body">
        <button
          type="button"
          className="app-document-card__name"
          onClick={onOpen}
        >
          {document.name}
        </button>
        <span className="app-document-card__meta">
          {formatDate(document.updatedAt)}
        </span>
      </div>
      <div className="app-document-card__actions">
        <button type="button" onClick={onRename} title="Rename">
          Rename
        </button>
        <button type="button" onClick={onDuplicate} title="Duplicate">
          {DuplicateIcon}
        </button>
        <button type="button" onClick={onExport} title="Export">
          {exportToFileIcon}
        </button>
        <button type="button" onClick={onDelete} title="Delete">
          {TrashIcon}
        </button>
      </div>
    </article>
  );
};
