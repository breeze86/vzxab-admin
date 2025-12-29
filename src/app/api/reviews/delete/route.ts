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
    const reviewId = Number(body?.reviewId);

    if (!reviewId || Number.isNaN(reviewId)) {
      return NextResponse.json({ message: "无效的评论ID" }, { status: 400 });
    }

    const result = await prisma.review.updateMany({
      where: { id: reviewId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "评论不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "删除失败" }, { status: 500 });
  }
}
