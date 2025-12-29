import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ message: "缺少token" }, { status: 400 });
    }

    await prisma.adminSession.deleteMany({
      where: {
        token,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "登出失败" }, { status: 500 });
  }
}
