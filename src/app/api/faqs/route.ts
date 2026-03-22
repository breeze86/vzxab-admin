import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { getOrderedFaqIds, insertFaqIdAt, parseFaqPayload, resequenceFaqSortOrders } from "@/lib/faq";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
    const query = (searchParams.get("query") || "").trim();
    const status = (searchParams.get("status") || "all").trim();

    const where: Prisma.FaqItemWhereInput = {
      ...(query
        ? {
            OR: [
              { question: { contains: query } },
              { answer: { contains: query } },
            ],
          }
        : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
    };

    const [items, total, allTotal, activeCount] = await prisma.$transaction([
      prisma.faqItem.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.faqItem.count({ where }),
      prisma.faqItem.count(),
      prisma.faqItem.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      data: items,
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
    return NextResponse.json({ message: "获取常见问题列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseFaqPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const item = await prisma.$transaction(async (tx) => {
      const orderedIds = await getOrderedFaqIds(tx);
      const created = await tx.faqItem.create({
        data: {
          ...parsed.data,
          sortOrder: orderedIds.length + 1,
        },
      });

      const nextIds = insertFaqIdAt(orderedIds, created.id, parsed.data.sortOrder);
      await resequenceFaqSortOrders(tx, nextIds);

      return tx.faqItem.findUnique({ where: { id: created.id } });
    });

    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ message: "新增常见问题失败" }, { status: 500 });
  }
}
