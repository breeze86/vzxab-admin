"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Mail, MessageSquare, Search, Trash2, TrendingUp, X } from "lucide-react";

type ContactItem = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

type ContactStats = {
  total: number;
  subjectCount: number;
  weekCount: number;
};

const subjectStyles: Record<string, string> = {
  产品咨询: "bg-[#dbeafe] text-[#1447e6]",
  技术支持: "bg-[#f3e8ff] text-[#8200db]",
  合作洽谈: "bg-[#dcfce7] text-[#008236]",
  功能建议: "bg-[#ffedd4] text-[#ca3500]",
  价格咨询: "bg-[#ffe4e6] text-[#e11d48]",
  售前演示: "bg-[#e0f2fe] text-[#0369a1]",
  账号问题: "bg-[#fef9c2] text-[#a16207]",
  发票开具: "bg-[#ede9fe] text-[#5b21b6]",
  数据迁移: "bg-[#d1fae5] text-[#047857]",
  系统集成: "bg-[#e2e8f0] text-[#334155]",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10).replace(/-/g, "/");
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [stats, setStats] = useState<ContactStats>({ total: 0, subjectCount: 0, weekCount: 0 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactItem | null>(null);
  const pageSize = 5;
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadContacts = async () => {
      setIsLoading(true);
      try {
        const search = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          ...(query ? { query } : {}),
          ...(subjectFilter ? { subject: subjectFilter } : {}),
        });
        const response = await fetch(`/api/contacts?${search.toString()}`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!isActive) return;
        setContacts(data.data ?? []);
        setStats({
          total: data.stats?.total ?? 0,
          subjectCount: data.stats?.subjectCount ?? 0,
          weekCount: data.stats?.weekCount ?? 0,
        });
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setSubjects(data.subjects ?? []);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadContacts();
    return () => {
      isActive = false;
    };
  }, [page, pageSize, query, subjectFilter, refreshKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsSubjectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const handleSearchChange = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const handleSubjectChange = (value: string) => {
    setPage(1);
    setSubjectFilter(value);
    setIsSubjectOpen(false);
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/contacts/export");
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contacts-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Ignore export errors for now.
    }
  };

  const openDelete = (contact: ContactItem) => {
    setDeleteTarget(contact);
    setIsDeleteOpen(true);
  };

  const closeDelete = () => {
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDelete = async (contactId: number) => {
    if (deletingId) return;
    setDeletingId(contactId);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/contacts/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contactId }),
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

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      <div className="flex h-[942px] w-full min-w-0 flex-col gap-8 px-8 pb-0 pt-8">
        <div className="flex w-full flex-col gap-2">
          <div className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#101828]">
            联系信息管理
          </div>
          <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">
            查看和管理客户联系请求
          </div>
        </div>

        <div className="grid h-[146px] w-full grid-cols-3 gap-6">
          <div className="flex flex-col gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px]">
            <div className="flex h-10 w-full items-center justify-between">
              <span className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">总消息数</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#dbeafe]">
                <Mail className="h-5 w-5 text-[#155dfc]" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">{stats.total}</div>
            <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">累计收到的消息</div>
          </div>

          <div className="flex flex-col gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px]">
            <div className="flex h-10 w-full items-center justify-between">
              <span className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">主题分类</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#f3e8ff]">
                <MessageSquare className="h-5 w-5 text-[#7c3aed]" strokeWidth={1.8} />
              </div>
            </div>
            <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">{stats.subjectCount}</div>
            <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">不同类型</div>
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
              placeholder="搜索联系信息..."
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex h-[50px] w-[140px] items-center justify-between rounded-[10px] border border-[#e5e7eb] bg-white px-4 text-[16px] tracking-[-0.3125px] text-[#0a0a0a]"
              type="button"
              onClick={() => setIsSubjectOpen((open) => !open)}
            >
              {subjectFilter || "全部主题"}
              <ChevronDown className="h-4 w-4 text-[#6a7282]" strokeWidth={1.8} />
            </button>
            {isSubjectOpen && (
              <div className="absolute right-0 top-[56px] z-10 w-[200px] overflow-hidden rounded-[12px] border border-[#e5e7eb] bg-white shadow-[0px_6px_18px_rgba(15,23,42,0.08)]">
                <button
                  className={`flex w-full items-center px-4 py-2 text-[14px] tracking-[-0.1504px] ${
                    subjectFilter ? "text-[#101828] hover:bg-[#f3f4f6]" : "text-[#155dfc] bg-[#eff6ff]"
                  }`}
                  type="button"
                  onClick={() => handleSubjectChange("")}
                >
                  全部主题
                </button>
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    className={`flex w-full items-center px-4 py-2 text-[14px] tracking-[-0.1504px] ${
                      subjectFilter === subject
                        ? "text-[#155dfc] bg-[#eff6ff]"
                        : "text-[#101828] hover:bg-[#f3f4f6]"
                    }`}
                    type="button"
                    onClick={() => handleSubjectChange(subject)}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            )}
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

        <div className="w-full min-w-0 overflow-x-hidden">
          <div className="flex flex-col overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">
            <div className="grid h-[56.5px] w-full grid-cols-[15%_14%_50%_10%_1fr] border-b border-[#e5e7eb] bg-[#f9fafb] text-[16px] font-bold tracking-[-0.3125px] text-[#4a5565]">
              <div className="flex items-center px-6">用户信息</div>
              <div className="flex items-center px-6">主题</div>
              <div className="flex items-center px-6">留言内容</div>
              <div className="flex items-center px-6">日期</div>
              <div className="flex items-center px-6">操作</div>
            </div>

            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="grid h-20.25 w-full grid-cols-[15%_14%_50%_10%_1fr] border-b border-[#e5e7eb]"
              >
                <div className="flex flex-col justify-center px-6">
                  <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">
                    {contact.name}
                  </div>
                  <div className="text-[14px] tracking-[-0.1504px] text-[#6a7282]">
                    {contact.email}
                  </div>
                </div>
                <div className="flex items-center px-6">
                  <span
                    className={`inline-flex h-7 items-center rounded-[999px] px-3 text-[14px] tracking-[-0.1504px] ${
                      subjectStyles[contact.subject] ?? "bg-[#e5e7eb] text-[#4a5565]"
                    }`}
                  >
                    {contact.subject}
                  </span>
                </div>
                <div className="flex items-center px-6 text-[16px] tracking-[-0.3125px] text-[#364153] break-words whitespace-normal">
                  {contact.message}
                </div>
                <div className="flex items-center px-6 text-[16px] tracking-[-0.3125px] text-[#4a5565]">
                  {formatDate(contact.createdAt)}
                </div>
                <div className="flex items-center px-6">
                  <button
                    className={`flex h-9 items-center gap-2 rounded-[10px] px-3 text-[14px] tracking-[-0.1504px] text-[#e7000b] transition-colors hover:bg-[#fff1f2] ${
                      deletingId === contact.id ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    type="button"
                    onClick={() => openDelete(contact)}
                    disabled={deletingId === contact.id}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    删除
                  </button>
                </div>
              </div>
            ))}

            {contacts.length === 0 && !isLoading && (
              <div className="flex h-[120px] items-center justify-center text-[14px] tracking-[-0.1504px] text-[#6a7282]">
                暂无联系信息
              </div>
            )}

            <div className="flex h-[73px] w-full items-center justify-between border-t border-[#e5e7eb] px-6 text-[14px] tracking-[-0.1504px] text-[#4a5565]">
              <div>
                显示 {startIndex} - {endIndex} 条，共 {total} 条
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
      {isDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.4)] px-4"
          onClick={closeDelete}
        >
          <div
            className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-[0px_20px_60px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-[18px] font-medium tracking-[-0.3125px] text-[#101828]">
                确认删除
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#6a7282] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeDelete}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-3 text-[14px] tracking-[-0.1504px] text-[#4a5565]">
              确定要删除该联系信息吗？删除后将不可恢复。
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="h-[40px] rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] tracking-[-0.1504px] text-[#4a5565] hover:bg-[#f3f4f6]"
                type="button"
                onClick={closeDelete}
              >
                取消
              </button>
              <button
                className="h-[40px] rounded-[10px] bg-[#e7000b] px-4 text-[14px] tracking-[-0.1504px] text-white hover:bg-[#c10007] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => {
                  if (!deleteTarget) return;
                  closeDelete();
                  handleDelete(deleteTarget.id);
                }}
                disabled={!deleteTarget || deletingId === deleteTarget?.id}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
