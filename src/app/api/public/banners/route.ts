import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "zh";

    const banners = await prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // 根据语言返回对应字段
    const mappedBanners = banners.map((banner) => ({
      id: banner.id,
      title: lang === "en" && (banner as { titleEn?: string }).titleEn
        ? (banner as { titleEn?: string }).titleEn!
        : banner.title,
      summary: lang === "en" && (banner as { summaryEn?: string }).summaryEn
        ? (banner as { summaryEn?: string }).summaryEn!
        : banner.summary,
      mediaType: banner.mediaType,
      videoPlayMode: banner.videoPlayMode,
      imageUrl: banner.imageUrl,
      videoUrl: banner.videoUrl,
      videoPosterUrl: banner.videoPosterUrl,
      linkUrl: lang === "en" && (banner as { linkUrlEn?: string }).linkUrlEn
        ? (banner as { linkUrlEn?: string }).linkUrlEn!
        : banner.linkUrl,
      sortOrder: banner.sortOrder,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    }));

    return NextResponse.json({ data: mappedBanners });
  } catch {
    return NextResponse.json({ message: "获取横幅列表失败" }, { status: 500 });
  }
}
