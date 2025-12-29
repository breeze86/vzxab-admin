import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

const formatDate = (value: Date) => {
  const iso = value.toISOString();
  return iso.slice(0, 10).replace(/-/g, "/");
};

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        email: true,
        rating: true,
        content: true,
        createdAt: true,
        replies: {
          orderBy: { repliedAt: "desc" },
          take: 1,
          select: {
            adminName: true,
            content: true,
            repliedAt: true,
          },
        },
      },
    });

    const rows = reviews.map((review) => {
      const reply = review.replies[0];
      return {
        用户名: review.name,
        邮箱: review.email,
        评分: review.rating,
        评论内容: review.content,
        评论日期: formatDate(review.createdAt),
        回复人: reply?.adminName ?? "",
        回复内容: reply?.content ?? "",
        回复日期: reply?.repliedAt ? formatDate(reply.repliedAt) : "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "用户名",
        "邮箱",
        "评分",
        "评论内容",
        "评论日期",
        "回复人",
        "回复内容",
        "回复日期",
      ],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "评论列表");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `reviews-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${fileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "导出失败" }, { status: 500 });
  }
}
