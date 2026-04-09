import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "zh";

    const items = await prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // 根据语言返回对应字段
    const mappedItems = items.map((item) => ({
      id: item.id,
      question: lang === "en" && (item as { questionEn?: string }).questionEn ? (item as { questionEn?: string }).questionEn! : item.question,
      answer: lang === "en" && (item as { answerEn?: string }).answerEn ? (item as { answerEn?: string }).answerEn! : item.answer,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ data: mappedItems });
  } catch {
    return NextResponse.json({ message: "获取常见问题列表失败" }, { status: 500 });
  }
}
