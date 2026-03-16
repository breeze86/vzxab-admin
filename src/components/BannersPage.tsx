"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Grip,
  Image as ImageIcon,
  LoaderCircle,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";

type BannerMediaType = "IMAGE" | "VIDEO";
type BannerVideoPlayMode = "HOVER" | "AUTO";

type BannerItem = {
  id: number;
  title: string;
  summary: string;
  mediaType: BannerMediaType;
  videoPlayMode: BannerVideoPlayMode;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BannerStats = {
  total: number;
  activeCount: number;
  inactiveCount: number;
};

type BannerFormState = {
  title: string;
  summary: string;
  mediaType: BannerMediaType;
  videoPlayMode: BannerVideoPlayMode;
  imageUrl: string;
  videoUrl: string;
  videoPosterUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
};

type ReorderAction = "move_up" | "move_down" | "move_top" | "move_bottom";

const emptyStats: BannerStats = {
  total: 0,
  activeCount: 0,
  inactiveCount: 0,
};

const MAX_TITLE_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 200;

const buildDefaultFormState = (sortOrder: number): BannerFormState => ({
  title: "",
  summary: "",
  mediaType: "IMAGE",
  videoPlayMode: "HOVER",
  imageUrl: "",
  videoUrl: "",
  videoPosterUrl: "",
  linkUrl: "",
  sortOrder,
  isActive: true,
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().slice(0, 10).replace(/-/g, "/")} ${date
    .toTimeString()
    .slice(0, 8)}`;
};

const getCharacterCount = (value: string) => Array.from(value).length;

const getAuthHeaders = (isJson = false) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getPreviewSrc = (value: string | null, baseUrl?: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  const normalizedPath = `/${value.replace(/^\/+/, "")}`;

  try {
    if (baseUrl && (baseUrl.startsWith("http://") || baseUrl.startsWith("https://"))) {
      return new URL(normalizedPath, baseUrl).toString();
    }
  } catch {
    // Ignore invalid base URL and fall back to current origin / relative path.
  }

  return normalizedPath;
};

export default function BannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [stats, setStats] = useState<BannerStats>(emptyStats);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | BannerMediaType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerItem | null>(null);
  const [form, setForm] = useState<BannerFormState>(buildDefaultFormState(1));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isComposingSearch, setIsComposingSearch] = useState(false);

  const titleCount = getCharacterCount(form.title);
  const summaryCount = getCharacterCount(form.summary);
  const isTitleOverflow = titleCount > MAX_TITLE_LENGTH;
  const isSummaryOverflow = summaryCount > MAX_SUMMARY_LENGTH;
  const isFormOverLimit = isTitleOverflow || isSummaryOverflow;

  useEffect(() => {
    let active = true;

    const loadBanners = async () => {
      setIsLoading(true);
      try {
        const search = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(query ? { query } : {}),
          ...(mediaTypeFilter !== "all" ? { mediaType: mediaTypeFilter } : {}),
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        });
        const response = await fetch(`/api/banners?${search.toString()}`, {
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

        setBanners(data.data ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setStats({
          total: data.stats?.total ?? 0,
          activeCount: data.stats?.activeCount ?? 0,
          inactiveCount: data.stats?.inactiveCount ?? 0,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadBanners();
    return () => {
      active = false;
    };
  }, [mediaTypeFilter, page, pageSize, query, refreshKey, router, statusFilter]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const maxSortOrder = useMemo(
    () => (editingBanner ? Math.max(1, stats.total) : stats.total + 1),
    [editingBanner, stats.total],
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

  const handleMediaTypeChange = (value: "all" | BannerMediaType) => {
    setPage(1);
    setMediaTypeFilter(value);
  };

  const handleStatusChange = (value: "all" | "active" | "inactive") => {
    setPage(1);
    setStatusFilter(value);
  };

  const handlePageSizeChange = (value: number) => {
    setPage(1);
    setPageSize(value);
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setForm(buildDefaultFormState(stats.total + 1));
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditModal = (banner: BannerItem) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      summary: banner.summary,
      mediaType: banner.mediaType,
      videoPlayMode: banner.videoPlayMode,
      imageUrl: banner.imageUrl || "",
      videoUrl: banner.videoUrl || "",
      videoPosterUrl: banner.videoPosterUrl || "",
      linkUrl: banner.linkUrl,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingBanner(null);
    setFormError("");
    setForm(buildDefaultFormState(Math.max(1, stats.total + 1)));
  };

  const openDeleteModal = (banner: BannerItem) => {
    setDeleteTarget(banner);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setIsDeleteOpen(false);
  };

  const updateForm = <K extends keyof BannerFormState>(key: K, value: BannerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitForm = async () => {
    if (isTitleOverflow) {
      setFormError(`横幅标题不能超过 ${MAX_TITLE_LENGTH} 个字符`);
      return;
    }

    if (isSummaryOverflow) {
      setFormError(`横幅描述不能超过 ${MAX_SUMMARY_LENGTH} 个字符`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const url = editingBanner ? `/api/banners/${editingBanner.id}` : "/api/banners";
      const method = editingBanner ? "PATCH" : "POST";
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
        setFormError(data?.message || "保存首页横幅失败");
        return;
      }

      closeFormModal();
      setRefreshKey((value) => value + 1);
    } catch {
      setFormError("保存首页横幅失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const actionKey = `delete:${deleteTarget.id}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch(`/api/banners/${deleteTarget.id}`, {
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
        window.alert(data?.message || "删除首页横幅失败");
        return;
      }

      closeDeleteModal();
      setRefreshKey((value) => value + 1);
    } catch {
      window.alert("删除首页横幅失败");
    } finally {
      setProcessingAction(null);
    }
  };

  const reorderBanner = async (bannerId: number, action: ReorderAction) => {
    const actionKey = `${action}:${bannerId}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch("/api/banners/reorder", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ bannerId, action }),
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
              首页横幅管理
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">
              管理门户首页横幅内容，并通过顺序操作控制前台展示先后
            </div>
          </div>

          <button
            className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-[#155dfc] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#1447e6]"
            type="button"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            新增横幅
          </button>
        </div>

        <div className="grid w-full grid-cols-3 gap-6">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">横幅总数</div>
            <div className="mt-2 text-[28px] font-semibold text-[#101828]">{stats.total}</div>
          </div>
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">启用中</div>
            <div className="mt-2 text-[28px] font-semibold text-[#008236]">{stats.activeCount}</div>
          </div>
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">未启用</div>
            <div className="mt-2 text-[28px] font-semibold text-[#6a7282]">{stats.inactiveCount}</div>
          </div>
        </div>

        <div className="flex h-[50px] w-full items-center gap-4">
          <div className="relative flex h-[50px] flex-1 items-center rounded-[10px] border border-[#e5e7eb] bg-white pl-12 pr-4">
            <Search className="absolute left-4 h-5 w-5 text-[#9ca3af]" strokeWidth={1.8} />
            <input
              className="w-full text-[16px] tracking-[-0.3125px] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)]"
              placeholder="搜索标题、描述或跳转链接..."
              value={searchInput}
              onChange={(event) => handleSearchChange(event.target.value)}
              onCompositionStart={handleSearchCompositionStart}
              onCompositionEnd={(event) => handleSearchCompositionEnd(event.currentTarget.value)}
            />
          </div>
          <select
            className="h-[50px] rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#0a0a0a]"
            value={mediaTypeFilter}
            onChange={(event) => handleMediaTypeChange(event.target.value as "all" | BannerMediaType)}
          >
            <option value="all">全部类型</option>
            <option value="IMAGE">图片横幅</option>
            <option value="VIDEO">视频横幅</option>
          </select>
          <select
            className="h-[50px] rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#0a0a0a]"
            value={statusFilter}
            onChange={(event) =>
              handleStatusChange(event.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">全部状态</option>
            <option value="active">已启用</option>
            <option value="inactive">未启用</option>
          </select>
        </div>

        <div className="w-full min-w-0 overflow-x-auto">
          <div className="min-w-[1220px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">
            <div className="grid grid-cols-[102px_minmax(260px,2.2fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_120px_170px_256px] border-b border-[#e5e7eb] bg-[#f9fafb] text-[15px] font-semibold text-[#4a5565]">
              <div className="px-5 py-4">顺序</div>
              <div className="px-5 py-4">横幅内容</div>
              <div className="px-5 py-4">媒体资源</div>
              <div className="px-5 py-4">跳转链接</div>
              <div className="px-5 py-4">状态</div>
              <div className="px-5 py-4">更新时间</div>
              <div className="px-5 py-4 text-center">操作</div>
            </div>

            {banners.map((banner) => {
              const isFirst = banner.sortOrder === 1;
              const isLast = banner.sortOrder === stats.total;

              return (
                <div
                  key={banner.id}
                  className="grid grid-cols-[102px_minmax(260px,2.2fr)_minmax(150px,1fr)_minmax(130px,0.8fr)_120px_170px_256px] border-b border-[#e5e7eb] text-[14px] text-[#364153]"
                >
                  <div className="px-5 py-5">
                    <div className="text-[18px] font-semibold text-[#101828]">{banner.sortOrder}</div>
                    <div className="mt-1 text-[12px] text-[#6a7282]">前台排序位</div>
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
                          banner.mediaType === "IMAGE" ? "bg-[#dbeafe]" : "bg-[#ede9fe]"
                        }`}
                      >
                        {banner.mediaType === "IMAGE" ? (
                          <ImageIcon className="h-5 w-5 text-[#155dfc]" strokeWidth={1.8} />
                        ) : (
                          <Video className="h-5 w-5 text-[#7c3aed]" strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 break-words text-[15px] font-medium leading-6 text-[#101828]">
                          {banner.title}
                        </div>
                        <div className="mt-1 line-clamp-3 text-[13px] leading-5 text-[#6a7282]">
                          {banner.summary}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-[#f8fafc]">
                      {banner.mediaType === "IMAGE" && banner.imageUrl ? (
                        // Banner 资源可能来自第三方域名，这里直接使用原始地址预览。
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPreviewSrc(banner.imageUrl, banner.linkUrl)}
                          alt={banner.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      {banner.mediaType === "VIDEO" && banner.videoPosterUrl ? (
                        // 视频列表仅展示封面缩略图，不直接播放视频。
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPreviewSrc(banner.videoPosterUrl, banner.linkUrl)}
                          alt={banner.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      {((banner.mediaType === "IMAGE" && !banner.imageUrl) ||
                        (banner.mediaType === "VIDEO" && !banner.videoPosterUrl)) && (
                        <div className="flex flex-col items-center gap-1 text-[#9ca3af]">
                          {banner.mediaType === "IMAGE" ? (
                            <ImageIcon className="h-5 w-5" strokeWidth={1.8} />
                          ) : (
                            <Video className="h-5 w-5" strokeWidth={1.8} />
                          )}
                          <span className="text-[11px]">暂无缩略图</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-5 text-[13px] leading-5 text-[#4a5565]">
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full text-[#155dfc] underline-offset-4 hover:underline"
                      title={banner.linkUrl}
                    >
                      <span className="truncate">访问链接</span>
                    </a>
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
                          banner.isActive
                            ? "bg-[#dcfce7] text-[#008236]"
                            : "bg-[#f3f4f6] text-[#6a7282]"
                        }`}
                      >
                        {banner.isActive ? "已启用" : "未启用"}
                      </span>
                      {banner.mediaType === "VIDEO" ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
                            banner.videoPlayMode === "AUTO"
                              ? "bg-[#ede9fe] text-[#7c3aed]"
                              : "bg-[#dbeafe] text-[#155dfc]"
                          }`}
                        >
                          {banner.videoPlayMode === "AUTO" ? "自动播放" : "悬停播放"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-5 py-5 text-[13px] leading-5 text-[#4a5565]">
                    {formatDate(banner.updatedAt)}
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
                            onClick={() => reorderBanner(banner.id, "move_top")}
                            disabled={isFirst || processingAction !== null}
                          >
                            {processingAction === `move_top:${banner.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ChevronsUp className="h-3.5 w-3.5" />
                            )}
                            置顶
                          </button>
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isLast ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderBanner(banner.id, "move_down")}
                            disabled={isLast || processingAction !== null}
                          >
                            {processingAction === `move_down:${banner.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoveDown className="h-3.5 w-3.5" />
                            )}
                            下移
                          </button>
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isLast ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderBanner(banner.id, "move_bottom")}
                            disabled={isLast || processingAction !== null}
                          >
                            {processingAction === `move_bottom:${banner.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ChevronsDown className="h-3.5 w-3.5" />
                            )}
                            末尾
                          </button>
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#bfdbfe] bg-white px-2 text-[12px] text-[#155dfc] hover:bg-[#eff6ff] ${
                              isFirst ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            type="button"
                            onClick={() => reorderBanner(banner.id, "move_up")}
                            disabled={isFirst || processingAction !== null}
                          >
                            {processingAction === `move_up:${banner.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoveUp className="h-3.5 w-3.5" />
                            )}
                            上移
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
                            onClick={() => openEditModal(banner)}
                            disabled={processingAction !== null}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑
                          </button>
                          <button
                            className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#fecdd3] bg-white px-2 text-[12px] text-[#e7000b] hover:bg-[#fff1f2]"
                            type="button"
                            onClick={() => openDeleteModal(banner)}
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

            {banners.length === 0 && !isLoading ? (
              <div className="flex h-[160px] items-center justify-center text-[14px] text-[#6a7282]">
                暂无首页横幅数据
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex h-[160px] items-center justify-center gap-2 text-[14px] text-[#6a7282]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                正在加载首页横幅数据...
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
                    page <= 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
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
                        className={`h-[42px] w-[34px] rounded-[10px] text-[16px] tracking-[-0.3125px] cursor-pointer ${
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
                        className="flex h-[42px] w-[34px] items-center justify-center text-[16px] tracking-[-0.3125px] text-[#6a7282] cursor-default"
                      >
                        ...
                      </span>
                    ),
                  )}
                </div>
                <button
                  className={`flex h-[38px] w-[46px] items-center justify-center rounded-[10px] border border-[#e5e7eb] ${
                    page >= totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
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
            className="w-full max-w-[760px] rounded-[18px] bg-white p-6 shadow-[0px_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[18px] font-medium text-[#101828]">
                  {editingBanner ? "编辑首页横幅" : "新增首页横幅"}
                </div>
                <div className="mt-1 text-[14px] text-[#6a7282]">
                  保存后将按显示顺序控制门户首页横幅的展示位置
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
                  <span>横幅标题</span>
                  <span
                    className={`text-[12px] ${
                      isTitleOverflow ? "text-[#e7000b]" : "text-[#6a7282]"
                    }`}
                  >
                    {titleCount}/{MAX_TITLE_LENGTH}
                  </span>
                </span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  maxLength={MAX_TITLE_LENGTH}
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
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

              <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                <span className="flex items-center justify-between gap-4">
                  <span>横幅描述</span>
                  <span
                    className={`text-[12px] ${
                      isSummaryOverflow ? "text-[#e7000b]" : "text-[#6a7282]"
                    }`}
                  >
                    {summaryCount}/{MAX_SUMMARY_LENGTH}
                  </span>
                </span>
                <textarea
                  className="h-28 rounded-[10px] border border-[#e5e7eb] px-4 py-3 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.summary}
                  onChange={(event) => updateForm("summary", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>媒体类型</span>
                <select
                  className="h-11 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.mediaType}
                  onChange={(event) => updateForm("mediaType", event.target.value as BannerMediaType)}
                >
                  <option value="IMAGE">图片</option>
                  <option value="VIDEO">视频</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>启用状态</span>
                <select
                  className="h-11 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.isActive ? "true" : "false"}
                  onChange={(event) => updateForm("isActive", event.target.value === "true")}
                >
                  <option value="true">已启用</option>
                  <option value="false">未启用</option>
                </select>
              </label>

              {form.mediaType === "IMAGE" ? (
                <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                  <span>图片地址</span>
                  <input
                    className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                    value={form.imageUrl}
                    onChange={(event) => updateForm("imageUrl", event.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                    <span>视频地址</span>
                    <input
                      className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                      value={form.videoUrl}
                      onChange={(event) => updateForm("videoUrl", event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                    <span>视频封面地址</span>
                    <input
                      className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                      value={form.videoPosterUrl}
                      onChange={(event) => updateForm("videoPosterUrl", event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                    <span>视频播放方式</span>
                    <select
                      className="h-11 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                      value={form.videoPlayMode}
                      onChange={(event) =>
                        updateForm("videoPlayMode", event.target.value as BannerVideoPlayMode)
                      }
                    >
                      <option value="HOVER">悬停播放</option>
                      <option value="AUTO">自动播放</option>
                    </select>
                  </label>
                </>
              )}

              <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>跳转链接</span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.linkUrl}
                  onChange={(event) => updateForm("linkUrl", event.target.value)}
                />
              </label>
            </div>

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
                disabled={isSubmitting || isFormOverLimit}
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "保存中..." : editingBanner ? "保存修改" : "创建横幅"}
              </button>
            </div>
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
              <div className="text-[18px] font-medium text-[#101828]">确认删除首页横幅</div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6a7282] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeDeleteModal}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-3 text-[14px] leading-6 text-[#4a5565]">
              确定要删除首页横幅“{deleteTarget?.title}”吗？删除后会重新整理其余横幅的显示顺序。
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
