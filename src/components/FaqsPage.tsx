"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  CircleHelp,
  Eye,
  EyeOff,
  Grip,
  LoaderCircle,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FaqStats = {
  total: number;
  activeCount: number;
  inactiveCount: number;
};

type FaqFormState = {
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type ReorderAction = "move_up" | "move_down" | "move_top" | "move_bottom";

const MAX_QUESTION_LENGTH = 200;
const MAX_ANSWER_LENGTH = 5000;

const emptyStats: FaqStats = {
  total: 0,
  activeCount: 0,
  inactiveCount: 0,
};

const buildDefaultFormState = (sortOrder: number): FaqFormState => ({
  question: "",
  answer: "",
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

const getAuthHeaders = (isJson = false) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function FaqsPage() {
  const router = useRouter();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [stats, setStats] = useState<FaqStats>(emptyStats);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [form, setForm] = useState<FaqFormState>(buildDefaultFormState(1));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isComposingSearch, setIsComposingSearch] = useState(false);

  const questionCount = Array.from(form.question).length;
  const answerCount = Array.from(form.answer).length;
  const isQuestionOverflow = questionCount > MAX_QUESTION_LENGTH;
  const isAnswerOverflow = answerCount > MAX_ANSWER_LENGTH;

  useEffect(() => {
    let active = true;

    const loadItems = async () => {
      setIsLoading(true);
      try {
        const search = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(query ? { query } : {}),
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        });

        const response = await fetch(`/api/faqs?${search.toString()}`, {
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
          activeCount: data.stats?.activeCount ?? 0,
          inactiveCount: data.stats?.inactiveCount ?? 0,
        });
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
  }, [page, pageSize, query, refreshKey, router, statusFilter]);

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

  const handleStatusChange = (value: "all" | "active" | "inactive") => {
    setPage(1);
    setStatusFilter(value);
  };

  const handlePageSizeChange = (value: number) => {
    setPage(1);
    setPageSize(value);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(buildDefaultFormState(stats.total + 1));
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditModal = (item: FaqItem) => {
    setEditingItem(item);
    setForm({
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormError("");
    setForm(buildDefaultFormState(Math.max(1, stats.total + 1)));
  };

  const openDeleteModal = (item: FaqItem) => {
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setIsDeleteOpen(false);
  };

  const updateForm = <K extends keyof FaqFormState>(key: K, value: FaqFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitForm = async () => {
    if (isQuestionOverflow) {
      setFormError(`问题标题不能超过 ${MAX_QUESTION_LENGTH} 个字符`);
      return;
    }
    if (isAnswerOverflow) {
      setFormError(`回答内容不能超过 ${MAX_ANSWER_LENGTH} 个字符`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const url = editingItem ? `/api/faqs/${editingItem.id}` : "/api/faqs";
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
        setFormError(data?.message || "保存常见问题失败");
        return;
      }

      closeFormModal();
      setRefreshKey((value) => value + 1);
    } catch {
      setFormError("保存常见问题失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const actionKey = `delete:${deleteTarget.id}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch(`/api/faqs/${deleteTarget.id}`, {
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
        window.alert(data?.message || "删除常见问题失败");
        return;
      }

      closeDeleteModal();
      setRefreshKey((value) => value + 1);
    } catch {
      window.alert("删除常见问题失败");
    } finally {
      setProcessingAction(null);
    }
  };

  const reorderItem = async (faqId: number, action: ReorderAction) => {
    const actionKey = `${action}:${faqId}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch("/api/faqs/reorder", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ faqId, action }),
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

  const toggleStatus = async (faqId: number, isActive: boolean) => {
    const actionKey = `status:${faqId}`;
    setProcessingAction(actionKey);
    try {
      const response = await fetch("/api/faqs/status", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ faqId, isActive }),
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        window.alert(data?.message || "更新状态失败");
        return;
      }

      setRefreshKey((value) => value + 1);
    } catch {
      window.alert("更新状态失败");
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
              常见问题管理
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">
              维护门户常见问题内容，并通过启用状态和顺序控制前台展示
            </div>
          </div>

          <button
            className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-[#155dfc] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#1447e6]"
            type="button"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            新增问题
          </button>
        </div>

        <div className="grid w-full grid-cols-3 gap-6">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">问题总数</div>
            <div className="mt-2 text-[28px] font-semibold text-[#101828]">{stats.total}</div>
          </div>
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">启用中</div>
            <div className="mt-2 text-[28px] font-semibold text-[#008236]">{stats.activeCount}</div>
          </div>
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">已禁用</div>
            <div className="mt-2 text-[28px] font-semibold text-[#6a7282]">{stats.inactiveCount}</div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-[#e5e7eb] bg-white p-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative flex h-[50px] min-w-0 flex-1 items-center rounded-[10px] border border-[#e5e7eb] bg-white pl-12 pr-4">
              <Search className="absolute left-4 h-5 w-5 text-[#9ca3af]" strokeWidth={1.8} />
              <input
                className="w-full text-[16px] tracking-[-0.3125px] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)]"
                placeholder="搜索问题标题或回答内容..."
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                onCompositionStart={handleSearchCompositionStart}
                onCompositionEnd={(event) => handleSearchCompositionEnd(event.currentTarget.value)}
              />
            </div>
            <select
              className="h-[50px] rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#0a0a0a]"
              value={statusFilter}
              onChange={(event) =>
                handleStatusChange(event.target.value as "all" | "active" | "inactive")
              }
            >
              <option value="all">全部状态</option>
              <option value="active">已启用</option>
              <option value="inactive">已禁用</option>
            </select>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-[10px] border border-[#eef2f6] bg-[#f8fafc] px-4 py-3 text-[14px] text-[#4a5565]">
            <CircleHelp className="h-4 w-4 text-[#155dfc]" strokeWidth={1.8} />
            禁用问题不会在门户网站展示
          </div>
        </div>

        <div className="w-full min-w-0 overflow-x-auto">
          <div className="min-w-[1180px] overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">
            <div className="grid grid-cols-[102px_minmax(420px,2.5fr)_120px_170px_256px] border-b border-[#e5e7eb] bg-[#f9fafb] text-[15px] font-semibold text-[#4a5565]">
              <div className="px-5 py-4">顺序</div>
              <div className="px-5 py-4">问题内容</div>
              <div className="px-5 py-4">状态</div>
              <div className="px-5 py-4">更新时间</div>
              <div className="px-5 py-4 text-center">操作</div>
            </div>

            {items.map((item) => {
              const isFirst = item.sortOrder === 1;
              const isLast = item.sortOrder === stats.total;

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[102px_minmax(420px,2.5fr)_120px_170px_256px] border-b border-[#e5e7eb] text-[14px] text-[#364153]"
                >
                  <div className="px-5 py-5">
                    <div className="text-[18px] font-semibold text-[#101828]">{item.sortOrder}</div>
                    <div className="mt-1 text-[12px] text-[#6a7282]">前台排序位</div>
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff]">
                        <CircleHelp className="h-5 w-5 text-[#155dfc]" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 break-words text-[15px] font-medium leading-6 text-[#101828]">
                          {item.question}
                        </div>
                        <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-[13px] leading-5 text-[#6a7282]">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
                        item.isActive ? "bg-[#dcfce7] text-[#008236]" : "bg-[#f3f4f6] text-[#6a7282]"
                      }`}
                    >
                      {item.isActive ? "已启用" : "已禁用"}
                    </span>
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
                        <div className="flex h-full min-h-[68px] w-6 shrink-0 items-center justify-center text-[#6a7282]">
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </div>
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                          <button
                            className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border px-2 text-[12px] ${
                              item.isActive
                                ? "border-[#dbe1ea] bg-white text-[#6a7282] hover:bg-[#f8fafc]"
                                : "border-[#bbf7d0] bg-white text-[#008236] hover:bg-[#f0fdf4]"
                            }`}
                            type="button"
                            onClick={() => toggleStatus(item.id, !item.isActive)}
                            disabled={processingAction !== null}
                          >
                            {processingAction === `status:${item.id}` ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : item.isActive ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            {item.isActive ? "禁用" : "启用"}
                          </button>
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
                            className="col-span-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-[8px] border border-[#fecdd3] bg-white px-2 text-[12px] text-[#e7000b] hover:bg-[#fff1f2]"
                            type="button"
                            onClick={() => openDeleteModal(item)}
                            disabled={processingAction !== null}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            硬删除
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
                暂无常见问题数据
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex h-[160px] items-center justify-center gap-2 text-[14px] text-[#6a7282]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                正在加载常见问题数据...
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
            className="w-full max-w-[760px] rounded-[18px] bg-white p-6 shadow-[0px_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[18px] font-medium text-[#101828]">
                  {editingItem ? "编辑常见问题" : "新增常见问题"}
                </div>
                <div className="mt-1 text-[14px] text-[#6a7282]">
                  保存后可通过启用状态和顺序控制门户网站常见问题展示
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
                  <span>问题标题</span>
                  <span
                    className={`text-[12px] ${
                      isQuestionOverflow ? "text-[#e7000b]" : "text-[#6a7282]"
                    }`}
                  >
                    {questionCount}/{MAX_QUESTION_LENGTH}
                  </span>
                </span>
                <input
                  className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  maxLength={MAX_QUESTION_LENGTH}
                  value={form.question}
                  onChange={(event) => updateForm("question", event.target.value)}
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
                  <span>回答内容</span>
                  <span
                    className={`text-[12px] ${
                      isAnswerOverflow ? "text-[#e7000b]" : "text-[#6a7282]"
                    }`}
                  >
                    {answerCount}/{MAX_ANSWER_LENGTH}
                  </span>
                </span>
                <textarea
                  className="h-40 rounded-[10px] border border-[#e5e7eb] px-4 py-3 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.answer}
                  onChange={(event) => updateForm("answer", event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                <span>启用状态</span>
                <select
                  className="h-11 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                  value={form.isActive ? "true" : "false"}
                  onChange={(event) => updateForm("isActive", event.target.value === "true")}
                >
                  <option value="true">已启用</option>
                  <option value="false">已禁用</option>
                </select>
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
                disabled={isSubmitting || isQuestionOverflow || isAnswerOverflow}
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "保存中..." : editingItem ? "保存修改" : "创建问题"}
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
              <div className="text-[18px] font-medium text-[#101828]">确认硬删除常见问题</div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6a7282] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeDeleteModal}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-3 text-[14px] leading-6 text-[#4a5565]">
              确定要硬删除常见问题“{deleteTarget?.question}”吗？删除后会重新整理其余问题的显示顺序，且不可恢复。
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
