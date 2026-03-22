import { DownloadCenterActionType, Prisma } from "@prisma/client";
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
    const fileType = (searchParams.get("fileType") || "all").trim();
    const normalizedQuery = query.toUpperCase();
    const queryActionType =
      normalizedQuery === "PREVIEW"
        ? DownloadCenterActionType.PREVIEW
        : normalizedQuery === "DOWNLOAD"
          ? DownloadCenterActionType.DOWNLOAD
          : null;

    const where: Prisma.DownloadCenterItemWhereInput = {
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { downloadUrl: { contains: query } },
              { fileType: { contains: query } },
              { fileSize: { contains: query } },
              ...(queryActionType ? [{ actionType: queryActionType }] : []),
            ],
          }
        : {}),
      ...(fileType !== "all" ? { fileType } : {}),
    };

    const [items, total, allTotal, distinctTypes] = await prisma.$transaction([
      prisma.downloadCenterItem.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.downloadCenterItem.count({ where }),
      prisma.downloadCenterItem.count(),
      prisma.downloadCenterItem.findMany({
        distinct: ["fileType"],
        orderBy: { fileType: "asc" },
        select: { fileType: true },
      }),
    ]);

    return NextResponse.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      stats: {
        total: allTotal,
        typeCount: distinctTypes.length,
      },
      types: distinctTypes.map((item) => item.fileType).filter(Boolean),
    });
  } catch {
    return NextResponse.json({ message: "获取下载中心列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseDownloadCenterPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const resolved = await resolveDownloadCenterMetadata(parsed.data);

    const item = await prisma.$transaction(async (tx) => {
      const orderedIds = await getOrderedDownloadIds(tx);
      const created = await tx.downloadCenterItem.create({
        data: {
          ...resolved,
          sortOrder: orderedIds.length + 1,
        },
      });

      const nextIds = insertDownloadIdAt(orderedIds, created.id, resolved.sortOrder);
      await resequenceDownloadSortOrders(tx, nextIds);

      return tx.downloadCenterItem.findUnique({ where: { id: created.id } });
    });

    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ message: "新增下载文档失败" }, { status: 500 });
  }
}
