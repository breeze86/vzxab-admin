"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Download,
  FileSpreadsheet,
  FileText,
  Grip,
  Link2,
  LoaderCircle,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

type DownloadItem = {
  id: number;
  name: string;
  nameEn: string | null;
  downloadUrl: string;
  downloadUrlEn: string | null;
  actionType: DownloadActionType;
  fileType: string;
  fileSize: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type DownloadStats = {
  total: number;
  typeCount: number;
};

type DownloadFormState = {
  name: string;
  nameEn: string;
  downloadUrl: string;
  downloadUrlEn: string;
  actionType: DownloadActionType;
  fileType: string;
  fileSize: string;
  sortOrder: number;
};

type DownloadActionType = "PREVIEW" | "DOWNLOAD";

type DetectFeedbackTone = "success" | "warning" | "error" | "info";

type ReorderAction = "move_up" | "move_down" | "move_top" | "move_bottom";

const DEFAULT_FILE_TYPE = "文件";
const DEFAULT_FILE_SIZE = "1M";
const DEFAULT_ACTION_TYPE: DownloadActionType = "DOWNLOAD";
const MAX_NAME_LENGTH = 200;

const emptyStats: DownloadStats = {
  total: 0,
  typeCount: 0,
};

const buildDefaultFormState = (sortOrder: number): DownloadFormState => ({
  name: "",
  nameEn: "",
  downloadUrl: "",
  downloadUrlEn: "",
  actionType: DEFAULT_ACTION_TYPE,
  fileType: DEFAULT_FILE_TYPE,
  fileSize: DEFAULT_FILE_SIZE,
  sortOrder,
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().slice(0, 10).replace(/-/g, "/")} ${date
    .toTimeString()
    .slice(0, 8)}`;
};

const getAuthHeaders = (isJson = false) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const stripFileExtension = (value: string) => value.replace(/\.[^.]+$/, "");

const detectFeedbackClassName: Record<DetectFeedbackTone, string> = {
  success: "border border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
  warning: "border border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
  error: "border border-[#fecdd3] bg-[#fff1f2] text-[#b42318]",
  info: "border border-[#e5e7eb] bg-[#f8fafc] text-[#4a5565]",
};

const buildDetectIncompleteMessage = (
  detectedFileType: boolean,
  detectedFileSize: boolean,
  reason: string,
) => {
  const missingLabels: string[] = [];
  const inputLabels: string[] = [];

  if (!detectedFileType) {
    missingLabels.push("文档类型");
    inputLabels.push("文档类型");
  }
  if (!detectedFileSize) {
    missingLabels.push("文件大小");
    inputLabels.push("文件大小");
  }

  const missingText = missingLabels.join("和");
  const inputText = inputLabels.join("、");
  const actionText = `建议点击“重新识别”或手工输入${inputText}`;

  return reason
    ? `未识别${missingText}，${actionText}。${reason}`
    : `未识别${missingText}，${actionText}。`;
};

const getDocumentIcon = (fileType: string) => {
  const normalized = fileType.trim().toUpperCase();
  if (["XLS", "XLSX", "CSV"].includes(normalized)) {
    return {
      icon: FileSpreadsheet,
      className: "bg-[#dcfce7] text-[#008236]",
    };
  }
  if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(normalized)) {
    return {
      icon: Archive,
      className: "bg-[#fef3c7] text-[#b45309]",
    };
  }
  return {
    icon: FileText,
    className: "bg-[#dbeafe] text-[#155dfc]",
  };
};

const getActionTypeMeta = (actionType: DownloadActionType) =>
  actionType === "PREVIEW"
    ? {
        label: "预览打开",
        className: "bg-[#eff6ff] text-[#155dfc]",
      }
    : {
        label: "直接下载",
        className: "bg-[#ecfdf3] text-[#027a48]",
      };

export default function DownloadsPage() {
  const router = useRouter();
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [stats, setStats] = useState<DownloadStats>(emptyStats);
  const [types, setTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DownloadItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DownloadItem | null>(null);
  const [form, setForm] = useState<DownloadFormState>(buildDefaultFormState(1));
  const [formError, setFormError] = useState("");
  const [detectMessage, setDetectMessage] = useState("");
  const [detectTone, setDetectTone] = useState<DetectFeedbackTone>("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isComposingSearch, setIsComposingSearch] = useState(false);
  const [lastDetectedUrl, setLastDetectedUrl] = useState("");

  const nameCount = Array.from(form.name).length;
  const isNameOverflow = nameCount > MAX_NAME_LENGTH;

  useEffect(() => {
    let active = true;

    const loadItems = async () => {
      setIsLoading(true);
      try {
        const search = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(query ? { query } : {}),
          ...(fileTypeFilter !== "all" ? { fileType: fileTypeFilter } : {}),
        });

        const response = await fetch(`/api/downloads?${search.toString()}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });

        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!active) return;

        setItems(data.data ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setStats({
          total: data.stats?.total ?? 0,
          typeCount: data.stats?.typeCount ?? 0,
        });
        setTypes(data.types ?? []);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      active = false;
    };
  }, [fileTypeFilter, page, pageSize, query, refreshKey, router]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const maxSortOrder = useMemo(
    () => (editingItem ? Math.max(1, stats.total) : stats.total + 1),
    [editingItem, stats.total],
  );

  const displayPages = useMemo(() => {
    if (totalPages <= 0) return [];
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const pages: Array<number | string> = [1];
    const middleStart = Math.max(2, Math.min(totalPages - 4, page - 1));
    const middleEnd = middleStart + 3;

    if (middleStart > 2) {
      pages.push("ellipsis-left");
    }

    for (let current = middleStart; current <= middleEnd; current += 1) {
      pages.push(current);
    }

    if (middleEnd < totalPages - 1) {
      pages.push("ellipsis-right");
    }

    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const applySearch = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (!isComposingSearch) {
      applySearch(value);
    }
  };

  const handleSearchCompositionStart = () => {
    setIsComposingSearch(true);
  };

  const handleSearchCompositionEnd = (value: string) => {
    setIsComposingSearch(false);
    setSearchInput(value);
    applySearch(value);
  };

  const handleFileTypeChange = (value: string) => {
    setPage(1);
    setFileTypeFilter(value);
  };

  const handlePageSizeChange = (value: number) => {
    setPage(1);
    setPageSize(value);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(buildDefaultFormState(stats.total + 1));
    setFormError("");
    setDetectMessage("");
    setDetectTone("info");
    setLastDetectedUrl("");
    setIsFormOpen(true);
  };

  const openEditModal = (item: DownloadItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      nameEn: item.nameEn ?? "",
      downloadUrl: item.downloadUrl,
      downloadUrlEn: item.downloadUrlEn ?? "",
      actionType: item.actionType,
      fileType: item.fileType,
      fileSize: item.fileSize,
      sortOrder: item.sortOrder,
    });
    setFormError("");
    setDetectMessage("");
    setDetectTone("info");
    setLastDetectedUrl(item.downloadUrl);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormError("");
    setDetectMessage("");
    setDetectTone("info");
    setLastDetectedUrl("");
    setForm(buildDefaultFormState(Math.max(1, stats.total + 1)));
  };

  const openDeleteModal = (item: DownloadItem) => {
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setIsDeleteOpen(false);
  };

  const updateForm = <K extends keyof DownloadFormState>(key: K, value: DownloadFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "downloadUrl") {
      setLastDetectedUrl("");
      setDetectMessage("");
      setDetectTone("info");
    }
  };

  const detectMetadata = async (force = false) => {
    const downloadUrl = form.downloadUrl.trim();
    if (!downloadUrl) {
      return;
    }
    if (!force && downloadUrl === lastDetectedUrl) {
      return;
    }

    setIsDetecting(true);
    setDetectMessage("");
    setDetectTone("info");

    try {
      const response = await fetch("/api/downloads/detect", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ downloadUrl }),
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDetectTone("error");
        setDetectMessage(data?.message || "自动识别失败，可手动填写");
        return;
      }

      const detectedType = data?.data?.fileType || DEFAULT_FILE_TYPE;
      const detectedSize = data?.data?.fileSize || DEFAULT_FILE_SIZE;
      const detectedName = typeof data?.data?.fileName === "string" ? data.data.fileName : "";
      const detectedFileType = Boolean(data?.data?.detectedFileType);
      const detectedFileSize = Boolean(data?.data?.detectedFileSize);
      const detectedReason =
        typeof data?.data?.reason === "string" ? data.data.reason.trim() : "";

      setForm((current) => ({
        ...current,
        name: current.name || (detectedName ? stripFileExtension(detectedName) : current.name),
        fileType: detectedType,
        fileSize: detectedSize,
      }));
      setLastDetectedUrl(downloadUrl);
      if (data?.data?.detected) {
        if (detectedFileType && detectedFileSize) {
          setDetectTone("success");
          setDetectMessage("识别完成，已更新文档类型和大小");
          window.setTimeout(() => {
            setDetectMessage((current) =>
              current === "识别完成，已更新文档类型和大小" ? "" : current,
            );
          }, 2400);
        } else {
          setDetectTone("warning");
          setDetectMessage(
            buildDetectIncompleteMessage(detectedFileType, detectedFileSize, detectedReason),
          );
        }
      } else {
        setDetectTone("error");
        setDetectMessage(
          buildDetectIncompleteMessage(detectedFileType, detectedFileSize, detectedReason),
        );
      }
    } catch {
      setDetectTone("error");
      setDetectMessage("自动识别失败，建议点击“重新识别”或手工输入文档类型、文件大小");
    } finally {
      setIsDetecting(false);
    }
  };

  const submitForm = async () => {
    if (isNameOverflow) {
      setFormError(`文档名称不能超过 ${MAX_NAME_LENGTH} 个字符`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const url = editingItem ? `/api/downloads/${editingItem.id}` : "/api/downloads";
      const method = editingItem ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        body: JSON.stringify(form),
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(data?.message || "保存下载文档失败");
        return;
      }

      closeFormModal();
      setRefreshKey((value) => value + 1);
    } catch {
      setFormError("保存下载文档失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const actionKey = `delete:${deleteTarget.id}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch(`/api/downloads/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        window.alert(data?.message || "删除下载文档失败");
        return;
      }

      closeDeleteModal();
      setRefreshKey((value) => value + 1);
    } catch {
      window.alert("删除下载文档失败");
    } finally {
      setProcessingAction(null);
    }
  };

  const reorderItem = async (itemId: number, action: ReorderAction) => {
    const actionKey = `${action}:${itemId}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch("/api/downloads/reorder", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ itemId, action }),
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        window.alert(data?.message || "调整顺序失败");
        return;
      }

      setRefreshKey((value) => value + 1);
    } catch {
      window.alert("调整顺序失败");
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      <div className="flex w-full min-w-0 flex-col gap-8 px-8 pb-8 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#101828]">
              下载中心管理
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">
              管理可下载文档，并通过顺序操作控制前台展示先后
            </div>
          </div>

          <button
            className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-[#155dfc] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#1447e6]"
            type="button"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            新增文档
          </button>
        </div>

        <div className="grid w-full grid-cols-3 gap-6">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">文档总数</div>
            <div className="mt-2 text-[28px] font-semibold text-[#101828]">{stats.total}</div>
          </div>
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">文档类型数</div>
            <div className="mt-2 text-[28px] font-semibold text-[#155dfc]">{stats.typeCount}</div>
          </div>
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">当前筛选结果</div>
            <div className="mt-2 text-[28px] font-semibold text-[#101828]">{total}</div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-[#e5e7eb] bg-white p-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative flex h-[50px] min-w-0 flex-1 items-center rounded-[10px] border border-[#e5e7eb] bg-white pl-12 pr-4">
              <Search className="absolute left-4 h-5 w-5 text-[#9ca3af]" strokeWidth={1.8} />
              <input
                className="w-full text-[16px] tracking-[-0.3125px] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)]"
                placeholder="搜索文档名称、下载链接、类型或大小..."
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                onCompositionStart={handleSearchCompositionStart}
                onCompositionEnd={(event) => handleSearchCompositionEnd(event.currentTarget.value)}
              />
            </div>
            <select
              className="h-[50px] rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#0a0a0a]"
              value={fileTypeFilter}
              onChange={(event) => handleFileTypeChange(event.target.value)}
            >
              <option value="all">全部类型</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-[10px] border border-[#eef2f6] bg-[#f8fafc] px-4 py-3 text-[14px] text-[#4a5565]">
            <Download className="h-4 w-4 text-[#155dfc]" strokeWidth={1.8} />
            支持链接自动识别类型和大小
          </div>
        </div>

        <div className="w-full min-w-0 overflow-x-auto">
          <div className="min-w-[1120px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">
            <div className="grid grid-cols-[102px_minmax(300px,2.3fr)_130px_130px_120px_170px_256px] border-b border-[#e5e7eb] bg-[#f9fafb] text-[15px] font-semibold text-[#4a5565]">
              <div className="px-5 py-4">顺序</div>
              <div className="px-5 py-4">文档信息</div>
              <div className="px-5 py-4">前端模式</div>
              <div className="px-5 py-4">文档类型</div>
              <div className="px-5 py-4">文档大小</div>
              <div className="px-5 py-4">更新时间</div>
              <div className="px-5 py-4 text-center">操作</div>
            </div>

            {items.map((item) => {
              const isFirst = item.sortOrder === 1;
              const isLast = item.sortOrder === stats.total;
              const iconMeta = getDocumentIcon(item.fileType);
              const actionMeta = getActionTypeMeta(item.actionType);
              const ItemIcon = iconMeta.icon;

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[102px_minmax(300px,2.3fr)_130px_130px_120px_170px_256px] border-b border-[#e5e7eb] text-[14px] text-[#364153]"
                >
                  <div className="px-5 py-5">
                    <div className="text-[18px] font-semibold text-[#101828]">{item.sortOrder}</div>
                    <div className="mt-1 text-[12px] text-[#6a7282]">前台排序位</div>
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${iconMeta.className}`}
                      >
                        <ItemIcon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 break-words text-[15px] font-medium leading-6 text-[#101828]">
                          {item.name}
                        </div>
                        <a
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 text-[13px] leading-5 text-[#155dfc] underline-offset-4 hover:underline"
                          title={item.downloadUrl}
                        >
                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.downloadUrl}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${actionMeta.className}`}
                    >
                      {actionMeta.label}
                    </span>
                  </div>

                  <div className="px-5 py-5">
                    <span className="inline-flex rounded-full bg-[#eff6ff] px-2.5 py-1 text-[12px] font-medium text-[#155dfc]">
                      {item.fileType || DEFAULT_FILE_TYPE}
                    </span>
                  </div>

                  <div className="px-5 py-5 text-[13px] leading-5 text-[#4a5565]">
                    {item.fileSize || DEFAULT_FILE_SIZE}
                  </div>

                  <div className="px-5 py-5 text-[13px] leading-5 text-[#4a5565]">
                    {formatDate(item.updatedAt)}
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex w-full flex-col gap-3">
                      <div className="flex items-start gap-2 rounded-[12px] border border-[#dbeafe] bg-[#f8fbff] p-2">
                        <div className="flex h-full min-h-[68px] w-6 shrink-0 items-center justify-center text-[#155dfc]">
                          <Grip className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </div>
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isFirst ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderItem(item.id, "move_top")}
                            disabled={isFirst || processingAction !== null}
                          >
                            {processingAction === `move_top:${item.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ChevronsUp className="h-3.5 w-3.5" />
                            )}
                            置顶
                          </button>
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isFirst ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderItem(item.id, "move_up")}
                            disabled={isFirst || processingAction !== null}
                          >
                            {processingAction === `move_up:${item.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoveUp className="h-3.5 w-3.5" />
                            )}
                            上移
                          </button>
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isLast ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderItem(item.id, "move_bottom")}
                            disabled={isLast || processingAction !== null}
                          >
                            {processingAction === `move_bottom:${item.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ChevronsDown className="h-3.5 w-3.5" />
                            )}
                            末尾
                          </button>
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isLast ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderItem(item.id, "move_down")}
                            disabled={isLast || processingAction !== null}
                          >
                            {processingAction === `move_down:${item.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoveDown className="h-3.5 w-3.5" />
                            )}
                            下移
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-[12px] border border-[#e5e7eb] bg-[#fafafa] p-2">
                        <div className="flex h-full min-h-[32px] w-6 shrink-0 items-center justify-center text-[#6a7282]">
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </div>
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                          <button
                            className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#dbe1ea] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff]"
                            type="button"
                            onClick={() => openEditModal(item)}
                            disabled={processingAction !== null}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑
                          </button>
                          <button
                            className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#fecdd3] bg-white px-2 text-[12px] text-[#e7000b] hover:bg-[#fff1f2]"
                            type="button"
                            onClick={() => openDeleteModal(item)}
                            disabled={processingAction !== null}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && !isLoading ? (
              <div className="flex h-[160px] items-center justify-center text-[14px] text-[#6a7282]">
                暂无下载文档数据
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex h-[160px] items-center justify-center gap-2 text-[14px] text-[#6a7282]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                正在加载下载文档数据...
              </div>
            ) : null}

            <div className="flex h-[75px] w-full items-center justify-between border-t border-[#e5e7eb] px-6 text-[14px] tracking-[-0.1504px] text-[#4a5565]">
              <div className="flex items-center gap-3">
                <div>
                  显示 {startIndex} - {endIndex} 条，共 {total} 条
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6a7282]">每页</span>
                  <div className="relative">
                    <select
                      className="h-[34px] rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-[14px] text-[#101828] focus:outline-none"
                      value={pageSize}
                      onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                    >
                      {[5, 10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[#6a7282]">条</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`flex h-[38px] w-[46px] items-center justify-center rounded-[10px] border border-[#e5e7eb] ${
                    page <= 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  }`}
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <div className="flex items-center gap-2">
                  {displayPages.map((pageNumber) =>
                    typeof pageNumber === "number" ? (
                      <button
                        key={pageNumber}
                        className={`h-[42px] w-[34px] cursor-pointer rounded-[10px] text-[16px] tracking-[-0.3125px] ${
                          pageNumber === page
                            ? "bg-[#155dfc] text-white"
                            : "border border-[#e5e7eb] text-[#0a0a0a]"
                        }`}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ) : (
                      <span
                        key={pageNumber}
                        className="flex h-[42px] w-[34px] cursor-default items-center justify-center text-[16px] tracking-[-0.3125px] text-[#6a7282]"
                      >
                        ...
                      </span>
                    ),
                  )}
                </div>
                <button
                  className={`flex h-[38px] w-[46px] items-center justify-center rounded-[10px] border border-[#e5e7eb] ${
                    page >= totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  }`}
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.4)] px-4"
          onClick={closeFormModal}
        >
          <div
            className="relative w-full max-w-[760px] rounded-[18px] bg-white p-6 shadow-[0px_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[18px] font-medium text-[#101828]">
                  {editingItem ? "编辑下载文档" : "新增下载文档"}
                </div>
                <div className="mt-1 text-[14px] text-[#6a7282]">
                  下载链接失焦后会自动识别文档类型和大小，识别失败可手动修改
                </div>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6a7282] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeFormModal}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span className="flex items-center justify-between gap-4">
                  <span>文档名称（中文）</span>
                  <span
                    className={`text-[12px] ${
                      isNameOverflow ? "text-[#e7000b]" : "text-[#6a7282]"
                    }`}
                  >
                    {nameCount}/{MAX_NAME_LENGTH}
                  </span>
                </span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  maxLength={MAX_NAME_LENGTH}
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span className="flex items-center justify-between gap-4">
                  <span>文档名称（英文）</span>
                  <span className="text-[12px] text-[#6a7282]">
                    {Array.from(form.nameEn).length}/{MAX_NAME_LENGTH}
                  </span>
                </span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  maxLength={MAX_NAME_LENGTH}
                  value={form.nameEn}
                  onChange={(event) => updateForm("nameEn", event.target.value)}
                  placeholder="可选"
                />
              </label>

              <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                <span className="flex items-center justify-between gap-4">
                  <span>下载链接（中文）</span>
                  <button
                    className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[#dbe1ea] bg-white px-3 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => void detectMetadata(true)}
                    disabled={isDetecting || !form.downloadUrl.trim()}
                  >
                    {isDetecting ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    重新识别
                  </button>
                </span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.downloadUrl}
                  onChange={(event) => updateForm("downloadUrl", event.target.value)}
                  onBlur={() => void detectMetadata(false)}
                />
              </label>

              <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>下载链接（英文）</span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.downloadUrlEn}
                  onChange={(event) => updateForm("downloadUrlEn", event.target.value)}
                  placeholder="可选，用于英文版网站"
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>显示顺序</span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  type="number"
                  min={1}
                  max={maxSortOrder}
                  value={form.sortOrder}
                  onChange={(event) => updateForm("sortOrder", Number(event.target.value) || 1)}
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>文档类型</span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.fileType}
                  onChange={(event) => updateForm("fileType", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>文档大小</span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.fileSize}
                  onChange={(event) => updateForm("fileSize", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>前端模式</span>
                <select
                  className="h-11 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.actionType}
                  onChange={(event) =>
                    updateForm("actionType", event.target.value as DownloadActionType)
                  }
                >
                  <option value="DOWNLOAD">直接下载</option>
                  <option value="PREVIEW">新页预览</option>
                </select>
              </label>
            </div>

            {detectMessage ? (
              <div
                className={`mt-4 rounded-[10px] px-4 py-3 text-[13px] ${detectFeedbackClassName[detectTone]}`}
              >
                {detectMessage}
              </div>
            ) : null}

            {formError ? <div className="mt-4 text-[13px] text-[#e7000b]">{formError}</div> : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="h-10 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#4a5565] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeFormModal}
              >
                取消
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#155dfc] px-4 text-[14px] text-white hover:bg-[#1447e6] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={submitForm}
                disabled={isSubmitting || isNameOverflow}
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "保存中..." : editingItem ? "保存修改" : "创建文档"}
              </button>
            </div>

            {isDetecting ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.82)] backdrop-blur-[1px]">
                <div className="flex min-w-[260px] flex-col items-center rounded-[16px] border border-[#dbeafe] bg-white px-6 py-5 shadow-[0px_12px_32px_rgba(15,23,42,0.12)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eff6ff]">
                    <LoaderCircle className="h-6 w-6 animate-spin text-[#155dfc]" strokeWidth={2} />
                  </div>
                  <div className="mt-4 text-[16px] font-medium text-[#101828]">
                    正在识别文档信息
                  </div>
                  <div className="mt-2 text-center text-[13px] leading-5 text-[#6a7282]">
                    正在根据下载链接获取文档类型和大小，请稍候
                  </div>
                  <div className="mt-1 text-center text-[12px] text-[#94a3b8]">
                    通常需要 1 - 3 秒
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.4)] px-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-[0px_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-[18px] font-medium text-[#101828]">确认删除下载文档</div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6a7282] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeDeleteModal}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-3 text-[14px] leading-6 text-[#4a5565]">
              确定要删除下载文档“{deleteTarget?.name}”吗？删除后会重新整理其余文档的显示顺序。
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="h-10 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#4a5565] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeDeleteModal}
              >
                取消
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#e7000b] px-4 text-[14px] text-white hover:bg-[#c10007] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={handleDelete}
                disabled={processingAction === `delete:${deleteTarget?.id}`}
              >
                {processingAction === `delete:${deleteTarget?.id}` ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
