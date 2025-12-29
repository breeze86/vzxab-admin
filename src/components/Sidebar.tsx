"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LayoutGrid, LogOut, Mail, MessageSquare } from "lucide-react";

const navItems = [
  {
    key: "dashboard",
    label: "仪表盘",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    key: "comments",
    label: "用户评论",
    href: "/comments",
    icon: MessageSquare,
  },
  {
    key: "contacts",
    label: "联系信息",
    href: "/contacts",
    icon: Mail,
  },
] as const;

type NavKey = (typeof navItems)[number]["key"];

const getActiveKey = (pathname: string): NavKey => {
  if (pathname.startsWith("/comments")) return "comments";
  if (pathname.startsWith("/contacts")) return "contacts";
  return "dashboard";
};

export default function Sidebar() {
  const pathname = usePathname() || "";
  const activeKey = getActiveKey(pathname);
  const router = useRouter();

  const handleLogout = async () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        await fetch("/api/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch (error) {
        // Ignore API failures and still clear local session.
      }
    }
    localStorage.removeItem("auth_token");
    router.replace("/login");
  };

  return (
    <aside className="flex h-screen w-[256px] flex-col border-r border-[#e5e7eb] bg-white">
      <div className="flex h-[93px] w-full flex-col items-start border-b border-[#e5e7eb] px-6 pb-px pt-6">
        <div className="flex h-[44px] w-full items-center gap-3">
          <div
            className="relative h-10 w-10 rounded-[10px]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(21, 93, 252, 1) 0%, rgba(152, 16, 250, 1) 100%)",
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="h-[44px] w-[84px]">
            <div className="relative h-6 w-full text-[16px] tracking-[-0.3125px] text-[#101828]">
              管理面板
            </div>
            <div className="relative h-5 w-full text-[14px] tracking-[-0.1504px] text-[#6a7282]">
              数据管理中心
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 px-4 pt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex h-12 w-full items-center gap-3 rounded-[10px] pl-4 transition-colors ${
                isActive ? "bg-[#eff6ff]" : "hover:bg-[#f3f4f6]"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-[#155dfc]" : "text-[#364153]"}`}
                strokeWidth={1.8}
              />
              <span
                className={`text-[16px] tracking-[-0.3125px] ${
                  isActive ? "text-[#155dfc]" : "text-[#364153]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex w-full flex-col gap-3 border-t border-[#e5e7eb] px-4 pb-4 pt-[17px]">
        <button
          className="flex h-12 w-full items-center gap-3 rounded-[10px] pl-4 cursor-pointer transition-colors hover:bg-[#fff1f2]"
          type="button"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 text-[#e7000b]" strokeWidth={1.8} />
          <span className="text-[16px] tracking-[-0.3125px] text-[#e7000b]">退出登录</span>
        </button>
      </div>
    </aside>
  );
}
