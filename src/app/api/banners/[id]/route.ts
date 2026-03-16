import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import {
  getOrderedBannerIds,
  insertBannerIdAt,
  parseBannerPayload,
  resequenceBannerSortOrders,
} from "@/lib/banner";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await context.params;
    const bannerId = Number(id);
    if (!bannerId || Number.isNaN(bannerId)) {
      return NextResponse.json({ message: "无效的 Banner ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = parseBannerPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const banner = await prisma.$transaction(async (tx) => {
      const existing = await tx.heroBanner.findUnique({ where: { id: bannerId } });
      if (!existing) {
        return null;
      }

      const orderedIds = await getOrderedBannerIds(tx, bannerId);
      await tx.heroBanner.update({
        where: { id: bannerId },
        data: parsed.data,
      });

      const nextIds = insertBannerIdAt(orderedIds, bannerId, parsed.data.sortOrder);
      await resequenceBannerSortOrders(tx, nextIds);

      return tx.heroBanner.findUnique({ where: { id: bannerId } });
    });

    if (!banner) {
      return NextResponse.json({ message: "Banner 不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ message: "更新 Banner 失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await context.params;
    const bannerId = Number(id);
    if (!bannerId || Number.isNaN(bannerId)) {
      return NextResponse.json({ message: "无效的 Banner ID" }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.heroBanner.findUnique({ where: { id: bannerId } });
      if (!existing) {
        return false;
      }

      await tx.heroBanner.delete({ where: { id: bannerId } });
      const orderedIds = await getOrderedBannerIds(tx);
      await resequenceBannerSortOrders(tx, orderedIds);
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ message: "Banner 不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "删除 Banner 失败" }, { status: 500 });
  }
}

