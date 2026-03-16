import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((item: unknown) => Number(item)).filter((item: number) => Number.isInteger(item) && item > 0)
      : [];
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;

    if (!ids.length) {
      return NextResponse.json({ message: "请选择要操作的横幅" }, { status: 400 });
    }

    if (isActive === null) {
      return NextResponse.json({ message: "无效的状态参数" }, { status: 400 });
    }

    const result = await prisma.heroBanner.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch {
    return NextResponse.json({ message: "批量更新横幅状态失败" }, { status: 500 });
  }
}

