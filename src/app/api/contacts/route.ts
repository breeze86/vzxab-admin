import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
    );
    const query = (searchParams.get("query") || "").trim();
    const subject = (searchParams.get("subject") || "").trim();

    const where = {
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { subject: { contains: query } },
              { message: { contains: query } },
            ],
          }
        : {}),
      ...(subject ? { subject } : {}),
    };

    const statsWhere = {};

    const weekSince = new Date();
    weekSince.setDate(weekSince.getDate() - 7);

    const [contacts, total, weekCount, distinctSubjects] = await prisma.$transaction([
      prisma.customerCooperation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.customerCooperation.count({ where }),
      prisma.customerCooperation.count({
        where: {
          ...statsWhere,
          createdAt: { gte: weekSince },
        },
      }),
      prisma.customerCooperation.findMany({
        where: statsWhere,
        select: { subject: true },
        distinct: ["subject"],
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: contacts,
      page,
      pageSize,
      total,
      totalPages,
      stats: {
        total,
        subjectCount: distinctSubjects.length,
        weekCount,
      },
      subjects: distinctSubjects.map((item) => item.subject).filter(Boolean).sort(),
    });
  } catch (error) {
    return NextResponse.json({ message: "获取联系信息失败" }, { status: 500 });
  }
}
