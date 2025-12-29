import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const SESSION_DAYS = 7;

const hashPasswordDigest = async (value: string) => {
  if (globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return createHash("sha256").update(value).digest("hex");
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const account = typeof body?.account === "string" ? body.account.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const passwordHashInput =
      typeof body?.passwordHash === "string" ? body.passwordHash : "";

    if (!account || (!password && !passwordHashInput)) {
      return NextResponse.json({ message: "账号或密码不能为空" }, { status: 400 });
    }

    if (account.length > 50) {
      return NextResponse.json(
        { message: "账号长度不能超过50个字符" },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findFirst({
      where: {
        username: account,
        isActive: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ message: "账号或密码错误" }, { status: 401 });
    }

    const passwordHash = passwordHashInput
      ? passwordHashInput
      : await hashPasswordDigest(password);
    if (passwordHash !== admin.passwordHash) {
      return NextResponse.json({ message: "账号或密码错误" }, { status: 401 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        token,
        expiresAt,
      },
    });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "登录失败" }, { status: 500 });
  }
}
