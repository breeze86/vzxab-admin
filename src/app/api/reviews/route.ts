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

    const where = {
      isDeleted: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
              { content: { contains: query } },
            ],
          }
        : {}),
    };

    const statsWhere = { isDeleted: false };

    const weekSince = new Date();
    weekSince.setDate(weekSince.getDate() - 7);

    const [reviews, total, ratingStats, weekCount] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          rating: true,
          content: true,
          createdAt: true,
          replies: {
            orderBy: { repliedAt: "desc" },
            take: 1,
            select: {
              id: true,
              adminName: true,
              content: true,
              repliedAt: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({ where: statsWhere, _avg: { rating: true } }),
      prisma.review.count({
        where: {
          ...statsWhere,
          createdAt: { gte: weekSince },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const mappedReviews = reviews.map((review) => ({
      ...review,
      latestReply: review.replies[0] ?? null,
      replies: undefined,
    }));

    return NextResponse.json({
      data: mappedReviews,
      page,
      pageSize,
      total,
      totalPages,
      stats: {
        total,
        avgRating: ratingStats._avg.rating ?? 0,
        weekCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "获取评论失败" }, { status: 500 });
  }
}
