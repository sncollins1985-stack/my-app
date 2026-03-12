import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import {
  DEFAULT_DOCUMENT_LOCAL_STORAGE_DIR,
  DEFAULT_DOCUMENT_STORAGE_PROVIDER,
  DOCUMENT_LOCAL_STORAGE_DIR_ENV,
} from "@/lib/documents/constants";

export type StoredDocumentFile = {
  buffer: Buffer;
  contentType?: string;
};

export type DocumentStorageOpenResult = {
  stream: Readable;
  contentLength: number;
};

export interface DocumentStorageProvider {
  readonly providerName: string;
  put(file: StoredDocumentFile, key: string): Promise<void>;
  open(key: string): Promise<DocumentStorageOpenResult>;
  delete(key: string): Promise<void>;
}

export class DocumentStorageFileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentStorageFileNotFoundError";
  }
}

function resolveLocalStorageBaseDirectory() {
  const configuredDir = process.env[DOCUMENT_LOCAL_STORAGE_DIR_ENV]?.trim();
  if (!configuredDir) {
    return path.resolve(process.cwd(), DEFAULT_DOCUMENT_LOCAL_STORAGE_DIR);
  }

  return path.isAbsolute(configuredDir)
    ? path.resolve(configuredDir)
    : path.resolve(process.cwd(), configuredDir);
}

function normalizeStorageKey(key: string) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  const segments = normalized.split("/");

  if (
    !normalized ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error("Document storage key is invalid");
  }

  return normalized;
}

function resolvePathForKey(baseDirectory: string, key: string) {
  const normalizedKey = normalizeStorageKey(key);
  const resolvedBase = path.resolve(baseDirectory);
  const candidatePath = path.resolve(resolvedBase, ...normalizedKey.split("/"));

  if (candidatePath !== resolvedBase && !candidatePath.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new Error("Document storage key escaped storage root");
  }

  return candidatePath;
}

class LocalDocumentStorageProvider implements DocumentStorageProvider {
  readonly providerName = DEFAULT_DOCUMENT_STORAGE_PROVIDER;

  constructor(private readonly baseDirectory: string) {}

  async put(file: StoredDocumentFile, key: string) {
    const destinationPath = resolvePathForKey(this.baseDirectory, key);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, file.buffer);
  }

  async open(key: string) {
    const sourcePath = resolvePathForKey(this.baseDirectory, key);

    let stats;
    try {
      stats = await fs.stat(sourcePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new DocumentStorageFileNotFoundError("Document file was not found in storage");
      }

      throw error;
    }

    return {
      stream: createReadStream(sourcePath),
      contentLength: stats.size,
    };
  }

  async delete(key: string) {
    const targetPath = resolvePathForKey(this.baseDirectory, key);

    try {
      await fs.unlink(targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      throw error;
    }
  }
}

const storageProviderCache = new Map<string, DocumentStorageProvider>();

function normalizeProviderName(providerName: string | null | undefined) {
  const normalized = providerName?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_DOCUMENT_STORAGE_PROVIDER;
}

export function getDocumentStorageProvider(providerName?: string | null): DocumentStorageProvider {
  const normalizedProvider = normalizeProviderName(providerName);
  const existing = storageProviderCache.get(normalizedProvider);
  if (existing) {
    return existing;
  }

  if (normalizedProvider !== DEFAULT_DOCUMENT_STORAGE_PROVIDER) {
    throw new Error(`Unsupported document storage provider: ${normalizedProvider}`);
  }

  const provider = new LocalDocumentStorageProvider(resolveLocalStorageBaseDirectory());
  storageProviderCache.set(normalizedProvider, provider);
  return provider;
}
