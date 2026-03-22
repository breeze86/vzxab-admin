import { DownloadCenterActionType, Prisma, PrismaClient } from "@prisma/client";

type DownloadDbClient = PrismaClient | Prisma.TransactionClient;

export type DownloadCenterInput = {
  name: string;
  downloadUrl: string;
  actionType: DownloadCenterActionType;
  fileType: string;
  fileSize: string;
  sortOrder: number;
};

export type DownloadCenterParseResult =
  | { ok: true; data: DownloadCenterInput }
  | { ok: false; message: string };

export type DownloadMetadata = {
  fileType: string | null;
  fileSize: string | null;
  fileName: string | null;
};

export type DownloadDetectionResult = DownloadMetadata & {
  detected: boolean;
  reason: string | null;
};

const DEFAULT_FILE_TYPE = "文件";
const DEFAULT_FILE_SIZE = "1M";
const DEFAULT_ACTION_TYPE = DownloadCenterActionType.DOWNLOAD;
const MAX_NAME_LENGTH = 200;
const MAX_URL_LENGTH = 500;
const MAX_FILE_META_LENGTH = 50;
const REQUEST_TIMEOUT_MS = 8000;

const FILE_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  xls: "XLS",
  xlsx: "XLSX",
  ppt: "PPT",
  pptx: "PPTX",
  csv: "CSV",
  txt: "TXT",
  zip: "ZIP",
  rar: "RAR",
  "7z": "7Z",
  tar: "TAR",
  gz: "GZ",
  mp4: "MP4",
  mov: "MOV",
  mp3: "MP3",
};

const FILE_TYPE_BY_CONTENT_TYPE: Array<[prefix: string, type: string]> = [
  ["application/pdf", "PDF"],
  ["application/msword", "DOC"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "DOCX",
  ],
  ["application/vnd.ms-excel", "XLS"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX"],
  ["application/vnd.ms-powerpoint", "PPT"],
  [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "PPTX",
  ],
  ["text/csv", "CSV"],
  ["text/plain", "TXT"],
  ["application/zip", "ZIP"],
  ["application/x-rar-compressed", "RAR"],
  ["application/x-7z-compressed", "7Z"],
  ["video/mp4", "MP4"],
  ["audio/mpeg", "MP3"],
];

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const clampPosition = (value: number, max: number) => Math.max(1, Math.min(value, max));

const normalizeFileType = (value: unknown) => {
  const normalized = normalizeText(value).toUpperCase();
  return normalized || DEFAULT_FILE_TYPE;
};

const normalizeFileSize = (value: unknown) => {
  const normalized = normalizeText(value);
  return normalized || DEFAULT_FILE_SIZE;
};

const normalizeActionType = (value: unknown) =>
  value === DownloadCenterActionType.PREVIEW || value === DownloadCenterActionType.DOWNLOAD
    ? value
    : DEFAULT_ACTION_TYPE;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const inferExtension = (value: string | null) => {
  if (!value) return null;
  const lastSegment = value.split("/").pop() || value;
  const cleanName = lastSegment.split("?")[0].split("#")[0];
  const index = cleanName.lastIndexOf(".");
  if (index === -1 || index === cleanName.length - 1) return null;
  return cleanName.slice(index + 1).toLowerCase();
};

const detectFileTypeFromExtension = (extension: string | null) =>
  extension ? FILE_TYPE_BY_EXTENSION[extension] || extension.toUpperCase() : null;

const detectFileTypeFromContentType = (contentType: string | null) => {
  if (!contentType) return null;
  const normalized = contentType.toLowerCase();
  const match = FILE_TYPE_BY_CONTENT_TYPE.find(([prefix]) => normalized.startsWith(prefix));
  return match?.[1] || null;
};

const parseContentDispositionFileName = (value: string | null) => {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/^["']|["']$/g, "");
    } catch {
      return utf8Match[1].replace(/^["']|["']$/g, "");
    }
  }

  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ? plainMatch[1].trim() : null;
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} ${units[unitIndex]}`;
  }

  const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")} ${units[unitIndex]}`;
};

const extractHeadersMetadata = (response: Response): DownloadMetadata => {
  const contentDisposition = response.headers.get("content-disposition");
  const contentType = response.headers.get("content-type");
  const contentLength = Number(response.headers.get("content-length"));
  const fileName = parseContentDispositionFileName(contentDisposition);
  const extension = inferExtension(fileName) ?? inferExtension(response.url);

  return {
    fileName,
    fileType: detectFileTypeFromContentType(contentType) ?? detectFileTypeFromExtension(extension),
    fileSize: Number.isFinite(contentLength) ? formatFileSize(contentLength) : null,
  };
};

const requestMetadata = async (downloadUrl: string, method: "HEAD" | "GET") => {
  const response = await fetch(downloadUrl, {
    method,
    redirect: "follow",
    headers:
      method === "GET"
        ? {
            Range: "bytes=0-0",
          }
        : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`目标地址返回 ${response.status}`);
  }

  const metadata = extractHeadersMetadata(response);
  if (method === "GET") {
    await response.body?.cancel();
  }

  return metadata;
};

const getDetectionFailureReason = (error: unknown) => {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return "请求超时，目标链接响应较慢";
    }
    if (error.message) {
      return error.message;
    }
  }
  return "未能读取目标链接的文件信息";
};

export const detectDownloadMetadata = async (
  downloadUrl: string,
): Promise<DownloadDetectionResult> => {
  const normalizedUrl = normalizeText(downloadUrl);
  if (!isHttpUrl(normalizedUrl)) {
    return {
      fileName: null,
      fileType: null,
      fileSize: null,
      detected: false,
      reason: "下载链接格式无效，仅支持 http 或 https 地址",
    };
  }

  const fallbackFileType = detectFileTypeFromExtension(inferExtension(normalizedUrl));
  let lastFailureReason: string | null = null;

  try {
    const metadata = await requestMetadata(normalizedUrl, "HEAD");
    return {
      fileName: metadata.fileName,
      fileType: metadata.fileType ?? fallbackFileType,
      fileSize: metadata.fileSize,
      detected: Boolean(metadata.fileType || metadata.fileSize || metadata.fileName),
      reason:
        metadata.fileType || metadata.fileSize || metadata.fileName
          ? null
          : "目标链接可访问，但未返回可识别的文件头信息",
    };
  } catch (error) {
    lastFailureReason = getDetectionFailureReason(error);
    try {
      const metadata = await requestMetadata(normalizedUrl, "GET");
      return {
        fileName: metadata.fileName,
        fileType: metadata.fileType ?? fallbackFileType,
        fileSize: metadata.fileSize,
        detected: Boolean(metadata.fileType || metadata.fileSize || metadata.fileName),
        reason:
          metadata.fileType || metadata.fileSize || metadata.fileName
            ? null
            : "目标链接可访问，但未返回可识别的文件头信息",
      };
    } catch (fallbackError) {
      lastFailureReason = getDetectionFailureReason(fallbackError) || lastFailureReason;
      return {
        fileName: null,
        fileType: fallbackFileType,
        fileSize: null,
        detected: Boolean(fallbackFileType),
        reason:
          fallbackFileType
            ? `${lastFailureReason || "未能读取文件头信息"}，已根据链接后缀推断文件类型`
            : lastFailureReason || "未能读取目标链接的文件信息",
      };
    }
  }
};

export const parseDownloadCenterPayload = (body: unknown): DownloadCenterParseResult => {
  const source = typeof body === "object" && body ? body : {};
  const name = normalizeText((source as Record<string, unknown>).name);
  const downloadUrl = normalizeText((source as Record<string, unknown>).downloadUrl);
  const actionType = normalizeActionType((source as Record<string, unknown>).actionType);
  const fileType = normalizeFileType((source as Record<string, unknown>).fileType);
  const fileSize = normalizeFileSize((source as Record<string, unknown>).fileSize);
  const sortOrderValue = Number((source as Record<string, unknown>).sortOrder);

  if (!name) {
    return { ok: false, message: "文档名称不能为空" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `文档名称不能超过 ${MAX_NAME_LENGTH} 个字符` };
  }
  if (!downloadUrl) {
    return { ok: false, message: "下载链接不能为空" };
  }
  if (downloadUrl.length > MAX_URL_LENGTH) {
    return { ok: false, message: `下载链接不能超过 ${MAX_URL_LENGTH} 个字符` };
  }
  if (!isHttpUrl(downloadUrl)) {
    return { ok: false, message: "下载链接必须是 http 或 https 地址" };
  }
  if (fileType.length > MAX_FILE_META_LENGTH) {
    return { ok: false, message: `文档类型不能超过 ${MAX_FILE_META_LENGTH} 个字符` };
  }
  if (fileSize.length > MAX_FILE_META_LENGTH) {
    return { ok: false, message: `文档大小不能超过 ${MAX_FILE_META_LENGTH} 个字符` };
  }
  if (!Number.isFinite(sortOrderValue) || !Number.isInteger(sortOrderValue) || sortOrderValue < 1) {
    return { ok: false, message: "显示顺序必须是大于 0 的整数" };
  }

  return {
    ok: true,
    data: {
      name,
      downloadUrl,
      actionType,
      fileType,
      fileSize,
      sortOrder: sortOrderValue,
    },
  };
};

export const resolveDownloadCenterMetadata = async (input: DownloadCenterInput) => {
  const detected = await detectDownloadMetadata(input.downloadUrl);
  const hasCustomFileType = input.fileType && input.fileType !== DEFAULT_FILE_TYPE;
  const hasCustomFileSize = input.fileSize && input.fileSize !== DEFAULT_FILE_SIZE;

  return {
    ...input,
    fileType: hasCustomFileType ? input.fileType : detected.fileType ?? DEFAULT_FILE_TYPE,
    fileSize: hasCustomFileSize ? input.fileSize : detected.fileSize ?? DEFAULT_FILE_SIZE,
  };
};

export const getOrderedDownloadIds = async (db: DownloadDbClient, excludeId?: number) => {
  const rows = await db.downloadCenterItem.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  return rows.map((item) => item.id);
};

export const insertDownloadIdAt = (
  ids: number[],
  downloadId: number,
  targetSortOrder: number,
) => {
  const nextIds = [...ids];
  const targetIndex = clampPosition(targetSortOrder, nextIds.length + 1) - 1;
  nextIds.splice(targetIndex, 0, downloadId);
  return nextIds;
};

export const resequenceDownloadSortOrders = async (db: DownloadDbClient, ids: number[]) => {
  for (const [index, id] of ids.entries()) {
    await db.downloadCenterItem.update({
      where: { id },
      data: { sortOrder: index + 1 },
    });
  }
};

export const downloadCenterDefaults = {
  actionType: DEFAULT_ACTION_TYPE,
  fileType: DEFAULT_FILE_TYPE,
  fileSize: DEFAULT_FILE_SIZE,
};
