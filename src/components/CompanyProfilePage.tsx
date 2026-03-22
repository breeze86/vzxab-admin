"use client";

import { useEffect, useState } from "react";
import { Building2, LoaderCircle, Mail, MapPin, Phone, Save } from "lucide-react";
import { useRouter } from "next/navigation";

type CompanyProfile = {
  phone: string;
  email: string;
  address: string;
  updatedAt: string | null;
};

const emptyProfile: CompanyProfile = {
  phone: "",
  email: "",
  address: "",
  updatedAt: null,
};

const formatDate = (value: string | null) => {
  if (!value) return "尚未保存";
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

export default function CompanyProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyProfile>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/company-profile", {
          headers: getAuthHeaders(),
          cache: "no-store",
        });

        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          router.replace("/login");
          return;
        }

        const data = await response.json().catch(() => null);
        if (!response.ok || !active) {
          if (active) {
            setErrorMessage(data?.message || "获取公司信息失败");
          }
          return;
        }

        setForm(data?.data ?? emptyProfile);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  const updateField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveMessage("");
    setErrorMessage("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/company-profile", {
        method: "PATCH",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          phone: form.phone,
          email: form.email,
          address: form.address,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setErrorMessage(data?.message || "保存公司信息失败");
        return;
      }

      setForm((current) => ({
        ...current,
        updatedAt: data?.data?.updatedAt ?? current.updatedAt,
      }));
      setSaveMessage("公司信息已保存");
    } catch {
      setErrorMessage("保存公司信息失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      <div className="flex w-full min-w-0 flex-col gap-8 px-8 pb-8 pt-8">
        <div className="flex w-full flex-col gap-2">
          <div className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#101828]">
            公司信息
          </div>
          <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">
            维护公司基础展示信息，当前包含电话、邮箱和地址，后续可在同一配置页继续扩展
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-6">
          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="text-[14px] text-[#4a5565]">配置类型</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eff6ff]">
                <Building2 className="h-5 w-5 text-[#155dfc]" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-2 text-[28px] font-semibold text-[#101828]">单配置</div>
            <div className="mt-1 text-[14px] text-[#6a7282]">非列表型公司基础信息</div>
          </div>

          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">当前字段</div>
            <div className="mt-2 text-[28px] font-semibold text-[#101828]">3</div>
            <div className="mt-1 text-[14px] text-[#6a7282]">电话、邮箱、地址</div>
          </div>

          <div className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="text-[14px] text-[#4a5565]">最近保存</div>
            <div className="mt-2 text-[18px] font-semibold text-[#101828]">
              {formatDate(form.updatedAt)}
            </div>
            <div className="mt-1 text-[14px] text-[#6a7282]">保存后前台可直接读取</div>
          </div>
        </div>

        <div className="w-full rounded-[16px] border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
          {isLoading ? (
            <div className="flex h-[220px] items-center justify-center gap-2 text-[14px] text-[#6a7282]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              正在加载公司信息...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#155dfc]" strokeWidth={1.8} />
                    公司电话
                  </span>
                  <input
                    className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="请输入公司电话"
                  />
                </label>

                <label className="flex flex-col gap-2 text-[14px] text-[#364153]">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#155dfc]" strokeWidth={1.8} />
                    公司邮箱
                  </span>
                  <input
                    className="h-11 rounded-[10px] border border-[#e5e7eb] px-4 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="请输入公司邮箱"
                  />
                </label>

                <label className="col-span-2 flex flex-col gap-2 text-[14px] text-[#364153]">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#155dfc]" strokeWidth={1.8} />
                    公司地址
                  </span>
                  <textarea
                    className="h-32 rounded-[10px] border border-[#e5e7eb] px-4 py-3 text-[14px] text-[#101828] outline-none focus:border-[#93c5fd]"
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder="请输入公司地址"
                  />
                </label>
              </div>

              {saveMessage ? (
                <div className="mt-4 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] text-[#166534]">
                  {saveMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-4 rounded-[10px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[13px] text-[#b42318]">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-end">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#155dfc] px-4 text-[14px] text-white hover:bg-[#1447e6] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? "保存中..." : "保存配置"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
