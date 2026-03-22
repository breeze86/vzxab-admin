import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const faqId = Number(body?.faqId);
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;

    if (!faqId || Number.isNaN(faqId)) {
      return NextResponse.json({ message: "无效的常见问题 ID" }, { status: 400 });
    }
    if (isActive === null) {
      return NextResponse.json({ message: "无效的状态参数" }, { status: 400 });
    }

    const updated = await prisma.faqItem.updateMany({
      where: { id: faqId },
      data: { isActive },
    });

    if (updated.count === 0) {
      return NextResponse.json({ message: "常见问题不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "更新常见问题状态失败" }, { status: 500 });
  }
}
