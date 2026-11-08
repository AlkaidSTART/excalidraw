import {
  fileOpen as _fileOpen,
  fileSave as _fileSave,
  supported as nativeFileSystemSupported,
} from "browser-fs-access";

import { MIME_TYPES } from "@excalidraw/common";

import { normalizeFile } from "./blob";

type FILE_EXTENSION = Exclude<keyof typeof MIME_TYPES, "binary">;

export type FileSaveOptions = {
  /** supply without the extension */
  name: string;
  /** file extension */
  extension: FILE_EXTENSION;
  mimeTypes?: string[];
  description: string;
  /** existing FileSystemFileHandle */
  fileHandle?: FileSystemFileHandle | null;
};

/**
 * Native shells (Tauri, Electron, Capacitor) can't rely on the browser
 * download fallback used by `browser-fs-access`, so they register their own
 * saver here.
 */
export type HostFileSaver = (
  blob: Blob,
  opts: FileSaveOptions,
) => Promise<FileSystemFileHandle | null>;

let hostFileSaver: HostFileSaver | null = null;

export const setHostFileSaver = (saver: HostFileSaver | null) => {
  hostFileSaver = saver;
};

export type HostFileOpener = (opts: {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: boolean;
}) => Promise<File | File[] | null>;

let hostFileOpener: HostFileOpener | null = null;

export const setHostFileOpener = (opener: HostFileOpener | null) => {
  hostFileOpener = opener;
};

export const fileOpen = async <M extends boolean | undefined = false>(opts: {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: M;
}): Promise<M extends false | undefined ? File : File[]> => {
  // an unsafe TS hack, alas not much we can do AFAIK
  type RetType = M extends false | undefined ? File : File[];

  if (hostFileOpener) {
    const result = await hostFileOpener({
      extensions: opts.extensions,
      description: opts.description,
      multiple: opts.multiple ?? false,
    });

    if (result === null) {
      throw new DOMException("The user aborted a request.", "AbortError");
    }

    if (Array.isArray(result)) {
      return (await Promise.all(
        result.map((file) => normalizeFile(file)),
      )) as RetType;
    }

    return (await normalizeFile(result)) as RetType;
  }

  const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
    mimeTypes.push(MIME_TYPES[type]);
    return mimeTypes;
  }, [] as string[]);

  const extensions = opts.extensions?.reduce((acc, ext) => {
    if (ext === "jpg") {
      return acc.concat(".jpg", ".jpeg");
    }
    return acc.concat(`.${ext}`);
  }, [] as string[]);

  const files = await _fileOpen({
    description: opts.description,
    extensions,
    mimeTypes,
    multiple: opts.multiple ?? false,
  });

  if (Array.isArray(files)) {
    return (await Promise.all(
      files.map((file) => normalizeFile(file)),
    )) as RetType;
  }
  return (await normalizeFile(files)) as RetType;
};

export const fileSave = async (
  blob: Blob | Promise<Blob>,
  opts: FileSaveOptions,
) => {
  if (hostFileSaver) {
    return hostFileSaver(await blob, opts);
  }

  return _fileSave(
    blob,
    {
      fileName: `${opts.name}.${opts.extension}`,
      description: opts.description,
      extensions: [`.${opts.extension}`],
      mimeTypes: opts.mimeTypes,
    },
    opts.fileHandle,
    false,
  );
};

export { nativeFileSystemSupported };
