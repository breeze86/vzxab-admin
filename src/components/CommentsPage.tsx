"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, MessageSquare, Pencil, Reply, Search, Star, Trash2, TrendingUp, X } from "lucide-react";

type ReviewReply = {
  id: number;
  adminName: string;
  content: string;
  repliedAt: string;
};

type ReviewItem = {
  id: number;
  name: string;
  email: string;
  rating: number;
  content: string;
  createdAt: string;
  latestReply: ReviewReply | null;
};

type ReviewStats = {
  total: number;
  avgRating: number;
  weekCount: number;
};

const fullStarClass = "fill-[#fbbf24] text-[#fbbf24]";
const emptyStarClass = "text-[#e5e7eb]";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10).replace(/-/g, "/");
};

export default function CommentsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, avgRating: 0, weekCount: 0 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReviewItem | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isActive = true;
    const loadReviews = async () => {
      setIsLoading(true);
      try {
        const search = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(query ? { query } : {}),
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        });
        const response = await fetch(`/api/reviews?${search.toString()}`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!isActive) return;
        setReviews(data.data ?? []);
        setStats({
          total: data.stats?.total ?? 0,
          avgRating: data.stats?.avgRating ?? 0,
          weekCount: data.stats?.weekCount ?? 0,
        });
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadReviews();
    return () => {
      isActive = false;
    };
  }, [page, pageSize, query, statusFilter, refreshKey]);

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

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const handleSearchChange = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const handleStatusChange = (value: string) => {
    setPage(1);
    setStatusFilter(value);
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/reviews/export");
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reviews-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Ignore export errors for now.
    }
  };

  const handlePageSizeChange = (value: number) => {
    setPage(1);
    setPageSize(value);
  };

  const openReply = (review: ReviewItem) => {
    setReplyTarget(review);
    setReplyContent(review.latestReply?.content ?? "");
    setReplyError("");
    setIsReplyOpen(true);
  };

  const closeReply = () => {
    setIsReplyOpen(false);
    setReplyTarget(null);
    setReplyContent("");
    setReplyError("");
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    const content = replyContent.trim();
    if (!content) {
      setReplyError("请输入回复内容");
      return;
    }

    setIsReplySubmitting(true);
    setReplyError("");
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reviewId: replyTarget.id,
          content,
          adminName: "管理员",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setReplyError(data?.message || "回复失败，请稍后重试");
        return;
      }

      closeReply();
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setReplyError("回复失败，请稍后重试");
    } finally {
      setIsReplySubmitting(false);
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (deletingId) return;
    setDeletingId(reviewId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/reviews/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reviewId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        window.alert(data?.message || "删除失败，请稍后重试");
        return;
      }

      setRefreshKey((key) => key + 1);
    } catch (error) {
      window.alert("删除失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  };

  const hasReply = Boolean(replyTarget?.latestReply);

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      <div className="flex w-full min-w-0 flex-col gap-8 px-8 pb-8 pt-8">
        <div className="flex w-full flex-col gap-2">
          <div className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#101828]">
            用户评论管理
          </div>
          <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">
            查看和管理所有用户评价反馈
          </div>
        </div>

        <div className="grid h-[146px] w-full grid-cols-3 gap-6">
          <div className="flex flex-col gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px]">
            <div className="flex h-10 w-full items-center justify-between">
              <span className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">总评论数</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#dbeafe]">
                <MessageSquare className="h-5 w-5 text-[#155dfc]" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">{stats.total}</div>
            <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">累计收到的评论</div>
          </div>

          <div className="flex flex-col gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px]">
            <div className="flex h-10 w-full items-center justify-between">
              <span className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">平均评分</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#fef9c2]">
                <Star className="h-5 w-5 text-[#f59e0b]" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">
              {stats.avgRating.toFixed(1)} / 5.0
            </div>
            <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">用户满意度</div>
          </div>

          <div className="flex flex-col gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px]">
            <div className="flex h-10 w-full items-center justify-between">
              <span className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">本周新增</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#dcfce7]">
                <TrendingUp className="h-5 w-5 text-[#16a34a]" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">{stats.weekCount}</div>
            <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">近7天收到</div>
          </div>
        </div>

        <div className="flex h-[50px] w-full items-center gap-4">
          <div className="relative flex h-[50px] flex-1 items-center rounded-[10px] border border-[#e5e7eb] bg-white pl-12 pr-4">
            <Search className="absolute left-4 h-5 w-5 text-[#9ca3af]" strokeWidth={1.8} />
            <input
              className="w-full text-[16px] tracking-[-0.3125px] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)]"
              placeholder="搜索评论..."
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
          <div className="relative inline-block">
            <select
              className="appearance-none h-12.5 pr-10 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#0a0a0a]"
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="pending">待回复</option>
              <option value="replied">已回复</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 h-4 w-4" color="#888f9b"/>
          </div>
          <button
            className="flex h-[50px] items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#155dfc] hover:bg-[#eff6ff]"
            type="button"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
            导出Excel
          </button>
        </div>

        <div className="w-full min-w-0 overflow-x-auto">
          <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">
            <div className="grid h-[56.5px] w-full grid-cols-[15%_10%_42%_9%_8%_1fr] border-b border-[#e5e7eb] bg-[#f9fafb] text-[16px] font-bold tracking-[-0.3125px] text-[#4a5565]">
              <div className="flex items-center px-6">用户信息</div>
              <div className="flex items-center px-6">评分</div>
              <div className="flex items-center px-6">评论内容</div>
              <div className="flex items-center px-6">状态</div>
              <div className="flex items-center px-6">日期</div>
              <div className="flex items-center justify-end px-6">操作</div>
            </div>

            {reviews.map((review) => {
              const isReplied = Boolean(review.latestReply);
              return (
                <div
                  key={review.id}
                  className="grid min-h-[77px] w-full grid-cols-[15%_10%_42%_9%_8%_1fr] border-b border-[#e5e7eb] py-[16.5px]"
                >
                  <div className="flex flex-col justify-center px-6">
                    <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">
                      {review.name}
                    </div>
                    <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">
                      {review.email}
                    </div>
                  </div>
                  <div className="flex items-center px-6">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${review.id}-star-${index}`}
                          className={`h-4 w-4 ${index < review.rating ? fullStarClass : emptyStarClass}`}
                          strokeWidth={1.4}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 px-6">
                    <div className="text-[16px] tracking-[-0.3125px] text-[#364153]">
                      {review.content}
                    </div>
                    {review.latestReply && (
                      <div className="rounded-[4px] border-l-2 border-[#51a2ff] bg-[#eff6ff] p-2">
                        <div className="text-[12px] leading-[16px] text-[#155dfc]">
                          管理员回复：
                        </div>
                        <div className="mt-1 text-[14px] leading-[20px] tracking-[-0.1504px] text-[#364153]">
                          {review.latestReply.content}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center px-6">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[12px] ${
                        isReplied ? "bg-[#dcfce7] text-[#008236]" : "bg-[#ffedd4] text-[#ca3500]"
                      }`}
                    >
                      {isReplied ? "已回复" : "待回复"}
                    </span>
                  </div>
                  <div className="flex items-center px-6 text-[14px] tracking-[-0.1504px] text-[#4a5565]">
                    {formatDate(review.createdAt)}
                  </div>
                  <div className="flex items-center justify-end gap-2 px-6">
                    <button
                      className="flex h-8 w-[72px] items-center justify-center gap-2 rounded-[10px] text-[14px] tracking-[-0.1504px] text-[#155dfc] hover:bg-[#eff6ff]"
                      type="button"
                      onClick={() => openReply(review)}
                    >
                      {isReplied ? (
                        <Pencil className="h-4 w-4" strokeWidth={1.8} />
                      ) : (
                        <Reply className="h-4 w-4" strokeWidth={1.8} />
                      )}
                      {isReplied ? "修改" : "回复"}
                    </button>
                    <button
                      className={`flex h-8 w-[72px] items-center justify-center gap-2 rounded-[10px] text-[14px] tracking-[-0.1504px] text-[#e7000b] hover:bg-[#fff1f2] ${
                        deletingId === review.id ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      删除
                    </button>
                  </div>
                </div>
              );
            })}

            {reviews.length === 0 && !isLoading && (
              <div className="flex h-[120px] items-center justify-center text-[14px] tracking-[-0.1504px] text-[#6a7282]">
                暂无评论数据
              </div>
            )}

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

      {isReplyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.4)] px-4"
          onClick={closeReply}
        >
          <div
            className="w-full max-w-[520px] rounded-[16px] bg-white p-6 shadow-[0px_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-[18px] font-medium tracking-[-0.3125px] text-[#101828]">
                {hasReply ? "修改回复" : "回复评论"}
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6a7282] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeReply}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-2 text-[14px] tracking-[-0.1504px] text-[#6a7282]">
              回复对象：{replyTarget?.name}
            </div>
            <div className="mt-4">
              <textarea
                className="h-[140px] w-full resize-none rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] tracking-[-0.1504px] text-[#101828] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#93c5fd]"
                placeholder="输入回复内容..."
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
              />
              {replyError && (
                <div className="mt-2 text-[13px] tracking-[-0.1204px] text-[#e7000b]">
                  {replyError}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="h-[40px] rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] tracking-[-0.1504px] text-[#4a5565] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeReply}
              >
                取消
              </button>
              <button
                className="h-[40px] rounded-[10px] bg-[#155dfc] px-4 text-[14px] tracking-[-0.1504px] text-white hover:bg-[#1447e6] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={submitReply}
                disabled={isReplySubmitting}
              >
                {isReplySubmitting ? "提交中..." : hasReply ? "保存修改" : "提交回复"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
