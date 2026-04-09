import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "zh";

    const items = await prisma.downloadCenterItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // 根据语言返回对应字段
    const mappedItems = items.map((item) => ({
      id: item.id,
      name: lang === "en" && (item as { nameEn?: string }).nameEn ? (item as { nameEn?: string }).nameEn! : item.name,
      downloadUrl:
        lang === "en" && (item as { downloadUrlEn?: string }).downloadUrlEn ? (item as { downloadUrlEn?: string }).downloadUrlEn! : item.downloadUrl,
      actionType: item.actionType,
      fileType: item.fileType,
      fileSize: item.fileSize,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ data: mappedItems });
  } catch {
    return NextResponse.json({ message: "获取下载中心列表失败" }, { status: 500 });
  }
}
