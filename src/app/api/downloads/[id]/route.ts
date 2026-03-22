import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import {
  getOrderedDownloadIds,
  insertDownloadIdAt,
  parseDownloadCenterPayload,
  resequenceDownloadSortOrders,
  resolveDownloadCenterMetadata,
} from "@/lib/download-center";
import prisma from "@/lib/prisma";

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
    const itemId = Number(id);
    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json({ message: "无效的下载文档 ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = parseDownloadCenterPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const resolved = await resolveDownloadCenterMetadata(parsed.data);

    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.downloadCenterItem.findUnique({ where: { id: itemId } });
      if (!existing) {
        return null;
      }

      const orderedIds = await getOrderedDownloadIds(tx, itemId);
      await tx.downloadCenterItem.update({
        where: { id: itemId },
        data: resolved,
      });

      const nextIds = insertDownloadIdAt(orderedIds, itemId, resolved.sortOrder);
      await resequenceDownloadSortOrders(tx, nextIds);

      return tx.downloadCenterItem.findUnique({ where: { id: itemId } });
    });

    if (!item) {
      return NextResponse.json({ message: "下载文档不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ message: "更新下载文档失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await context.params;
    const itemId = Number(id);
    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json({ message: "无效的下载文档 ID" }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.downloadCenterItem.findUnique({ where: { id: itemId } });
      if (!existing) {
        return false;
      }

      await tx.downloadCenterItem.delete({ where: { id: itemId } });
      const orderedIds = await getOrderedDownloadIds(tx);
      await resequenceDownloadSortOrders(tx, orderedIds);
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ message: "下载文档不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "删除下载文档失败" }, { status: 500 });
  }
}
