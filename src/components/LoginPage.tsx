"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sha256 } from "js-sha256";
import { Eye, LayoutGrid, Lock, Mail } from "lucide-react";
import IcpRecord from "@/components/IcpRecord";

const AUTH_TOKEN_KEY = "auth_token";

const hashPasswordDigest = async (value: string) => {
  if (globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return sha256(value);
};

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isFormValid = useMemo(
    () =>
      account.trim().length > 0 &&
      account.trim().length <= 50 &&
      password.trim().length > 0,
    [account, password]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const passwordHash = await hashPasswordDigest(password);
      const normalizedAccount = account.trim();
      if (normalizedAccount.length > 50) {
        setError("账号长度不能超过50个字符");
        return;
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: normalizedAccount,
          passwordHash,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || "账号或密码错误");
        return;
      }

      if (data?.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      router.push("/dashboard");
    } catch (err) {
      setError("登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-white"
      style={{
        backgroundImage:
          "linear-gradient(146.86249124020816deg, rgba(239, 246, 255, 1) 0%, rgba(250, 245, 255, 1) 50%, rgba(253, 242, 248, 1) 100%), linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 100%)",
      }}
    >
      <div className="relative h-[672px] w-[448px]">
        <div className="flex h-full flex-col items-start gap-8">
          <div className="relative h-[136px] w-full">
            <div
              className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-2xl shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(21, 93, 252, 1) 0%, rgba(152, 16, 250, 1) 100%)",
              }}
            >
              <LayoutGrid className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
            <div className="absolute left-0 top-20 w-full text-center text-base tracking-[-0.3125px] text-[#101828]">
              管理面板
            </div>
            <div className="absolute left-0 top-28 w-full text-center text-base tracking-[-0.3125px] text-[#4a5565]">
              欢迎回来，请登录您的账户
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-6 rounded-2xl border border-[#f3f4f6] bg-white p-[33px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]">
            <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit}>
              <div className="flex w-full flex-col gap-2">
                <label className="text-base tracking-[-0.3125px] text-[#364153]">
                  账号
                </label>
                <div className="relative h-[50px]">
                  <Mail
                    className="absolute left-3 top-[15px] h-5 w-5 text-[#9ca3af]"
                    strokeWidth={1.5}
                  />
                  <input
                    className="h-full w-full rounded-[10px] border border-[#e5e7eb] bg-white py-3 pl-10 pr-4 text-base tracking-[-0.3125px] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)]"
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                    placeholder="输入账号"
                    type="text"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="flex w-full flex-col gap-2">
                <label className="text-base tracking-[-0.3125px] text-[#364153]">
                  密码
                </label>
                <div className="relative h-[50px]">
                  <Lock
                    className="absolute left-3 top-[15px] h-5 w-5 text-[#9ca3af]"
                    strokeWidth={1.5}
                  />
                  <input
                    className="h-full w-full rounded-[10px] border border-[#e5e7eb] bg-white py-3 pl-10 pr-12 text-base tracking-[-0.3125px] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)]"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="输入您的密码"
                    type="password"
                  />
                  <Eye
                    className="absolute right-3 top-[15px] h-5 w-5 text-[#9ca3af]"
                    strokeWidth={1.5}
                  />
                </div>
              </div>

              {error ? (
                <div className="text-sm text-[#e7000b]">{error}</div>
              ) : null}

              <button
                className="relative h-12 w-full rounded-[10px] text-center text-base tracking-[-0.3125px] text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(21, 93, 252, 1) 0%, rgba(152, 16, 250, 1) 100%)",
                }}
                type="submit"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? "登录中..." : "登录"}
              </button>
            </form>
          </div>

          <div className="flex w-full flex-nowrap items-center justify-center gap-2 text-center text-sm leading-5 tracking-[-0.1504px] text-[#6a7282]">
            <span className="leading-5">© 2025 管理面板. 保留所有权利</span>
            <span className="leading-5">·</span>
            <IcpRecord className="leading-5" linkClassName="text-sm leading-5 tracking-[-0.1504px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
