import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reviewId = Number(body?.reviewId);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const adminName = typeof body?.adminName === "string" ? body.adminName.trim() : "管理员";

    if (!reviewId || Number.isNaN(reviewId)) {
      return NextResponse.json({ message: "无效的评论ID" }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ message: "回复内容不能为空" }, { status: 400 });
    }

    const review = await prisma.review.findFirst({
      where: { id: reviewId, isDeleted: false },
      select: { id: true },
    });

    if (!review) {
      return NextResponse.json({ message: "评论不存在" }, { status: 404 });
    }

    const existingReply = await prisma.reviewReply.findFirst({
      where: { reviewId },
      select: { id: true },
    });

    const reply = existingReply
      ? await prisma.reviewReply.update({
          where: { id: existingReply.id },
          data: {
            adminName: adminName || "管理员",
            content,
            repliedAt: new Date(),
          },
          select: {
            id: true,
            reviewId: true,
            adminName: true,
            content: true,
            repliedAt: true,
          },
        })
      : await prisma.reviewReply.create({
          data: {
            reviewId,
            adminName: adminName || "管理员",
            content,
          },
          select: {
            id: true,
            reviewId: true,
            adminName: true,
            content: true,
            repliedAt: true,
          },
        });

    return NextResponse.json({ success: true, data: reply });
  } catch (error) {
    return NextResponse.json({ message: "回复失败" }, { status: 500 });
  }
}
