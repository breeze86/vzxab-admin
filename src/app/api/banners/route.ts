import { NextResponse } from "next/server";
import { HeroBannerMediaType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import {
  getOrderedBannerIds,
  insertBannerIdAt,
  parseBannerPayload,
  resequenceBannerSortOrders,
} from "@/lib/banner";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 5));
    const query = (searchParams.get("query") || "").trim();
    const mediaType = (searchParams.get("mediaType") || "all").trim();
    const status = (searchParams.get("status") || "all").trim();

    const where: Prisma.HeroBannerWhereInput = {
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { summary: { contains: query } },
              { linkUrl: { contains: query } },
            ],
          }
        : {}),
      ...(mediaType === HeroBannerMediaType.IMAGE || mediaType === HeroBannerMediaType.VIDEO
        ? { mediaType }
        : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
    };

    const [banners, total, allTotal, activeCount] = await prisma.$transaction([
      prisma.heroBanner.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.heroBanner.count(),
      prisma.heroBanner.count({ where }),
      prisma.heroBanner.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      data: banners,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        total: allTotal,
        activeCount,
        inactiveCount: allTotal - activeCount,
      },
    });
  } catch {
    return NextResponse.json({ message: "获取 Banner 列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseBannerPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const banner = await prisma.$transaction(async (tx) => {
      const orderedIds = await getOrderedBannerIds(tx);
      const created = await tx.heroBanner.create({
        data: {
          ...parsed.data,
          sortOrder: orderedIds.length + 1,
        },
      });

      const nextIds = insertBannerIdAt(orderedIds, created.id, parsed.data.sortOrder);
      await resequenceBannerSortOrders(tx, nextIds);

      return tx.heroBanner.findUnique({ where: { id: created.id } });
    });

    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ message: "新增 Banner 失败" }, { status: 500 });
  }
}
