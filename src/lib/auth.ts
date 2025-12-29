import prisma from "@/lib/prisma";

export type AuthResult =
  | { ok: true; adminId: number; adminName: string }
  | { ok: false; status: number; message: string };

export async function requireAdminAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = bearerToken || "";

  if (!token) {
    return { ok: false, status: 401, message: "缺少登录凭证" };
  }

  const session = await prisma.adminSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    include: {
      admin: true,
    },
  });

  if (!session || !session.admin?.isActive) {
    return { ok: false, status: 401, message: "登录已失效" };
  }

  return {
    ok: true,
    adminId: session.adminId,
    adminName: session.admin.displayName || session.admin.username,
  };
}
