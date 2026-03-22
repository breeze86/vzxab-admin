import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { getOrderedFaqIds, insertFaqIdAt, parseFaqPayload, resequenceFaqSortOrders } from "@/lib/faq";
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
    const faqId = Number(id);
    if (!faqId || Number.isNaN(faqId)) {
      return NextResponse.json({ message: "无效的常见问题 ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = parseFaqPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.faqItem.findUnique({ where: { id: faqId } });
      if (!existing) {
        return null;
      }

      const orderedIds = await getOrderedFaqIds(tx, faqId);
      await tx.faqItem.update({
        where: { id: faqId },
        data: parsed.data,
      });

      const nextIds = insertFaqIdAt(orderedIds, faqId, parsed.data.sortOrder);
      await resequenceFaqSortOrders(tx, nextIds);

      return tx.faqItem.findUnique({ where: { id: faqId } });
    });

    if (!item) {
      return NextResponse.json({ message: "常见问题不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ message: "更新常见问题失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await context.params;
    const faqId = Number(id);
    if (!faqId || Number.isNaN(faqId)) {
      return NextResponse.json({ message: "无效的常见问题 ID" }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.faqItem.findUnique({ where: { id: faqId } });
      if (!existing) {
        return false;
      }

      await tx.faqItem.delete({ where: { id: faqId } });
      const orderedIds = await getOrderedFaqIds(tx);
      await resequenceFaqSortOrders(tx, orderedIds);
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ message: "常见问题不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "删除常见问题失败" }, { status: 500 });
  }
}
