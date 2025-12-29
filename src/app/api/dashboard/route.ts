import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const formatDateKey = (value: Date) => value.toISOString().slice(0, 10);

export async function GET() {
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const weekStart = new Date(now);
    const dayOffset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setMilliseconds(0);

    const weekSince = new Date();
    weekSince.setDate(weekSince.getDate() - 7);

    const [
      reviewTotal,
      contactTotal,
      avgRating,
      reviewsThisWeek,
      contactsThisWeek,
      reviewsPrevWeek,
      contactsPrevWeek,
      reviewsRecent,
      contactsRecent,
      ratings,
      subjects,
      recentReviews,
      recentContacts,
    ] = await prisma.$transaction([
      prisma.review.count({ where: { isDeleted: false } }),
      prisma.customerCooperation.count(),
      prisma.review.aggregate({ where: { isDeleted: false }, _avg: { rating: true } }),
      prisma.review.count({ where: { isDeleted: false, createdAt: { gte: weekStart, lt: weekEnd } } }),
      prisma.customerCooperation.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
      prisma.review.count({
        where: { isDeleted: false, createdAt: { gte: prevWeekStart, lt: weekStart } },
      }),
      prisma.customerCooperation.count({
        where: { createdAt: { gte: prevWeekStart, lt: weekStart } },
      }),
      prisma.review.findMany({
        where: { isDeleted: false, createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      prisma.customerCooperation.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { isDeleted: false },
        orderBy: { rating: "asc" },
        _count: { rating: true },
      }),
      prisma.customerCooperation.groupBy({
        by: ["subject"],
        orderBy: { subject: "asc" },
        _count: { subject: true },
      }),
      prisma.review.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          content: true,
          createdAt: true,
        },
      }),
      prisma.customerCooperation.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          message: true,
          createdAt: true,
        },
      }),
    ]);

    const trendMap = new Map();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      trendMap.set(formatDateKey(date), { date: formatDateKey(date), reviews: 0, contacts: 0 });
    }

    for (const review of reviewsRecent) {
      const key = formatDateKey(review.createdAt);
      const item = trendMap.get(key);
      if (item) item.reviews += 1;
    }

    for (const contact of contactsRecent) {
      const key = formatDateKey(contact.createdAt);
      const item = trendMap.get(key);
      if (item) item.contacts += 1;
    }

    const trend7d = Array.from(trendMap.values());

    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => {
      const match = ratings.find((item) => item.rating === rating);
      return { rating, count: match?._count?.rating ?? 0 };
    });

    const contactSubjects = subjects
      .filter((item) => item.subject)
      .map((item) => ({ subject: item.subject, count: item._count.subject }));

    const activity = [
      ...recentReviews.map((review) => ({
        id: `review-${review.id}`,
        type: "review" as const,
        name: review.name,
        email: review.email,
        content: review.content,
        createdAt: review.createdAt,
      })),
      ...recentContacts.map((contact) => ({
        id: `contact-${contact.id}`,
        type: "contact" as const,
        name: contact.name,
        email: contact.email,
        content: contact.message,
        createdAt: contact.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const buildTrend = (current: number, previous: number) => {
      const delta = current - previous;
      const percent = previous === 0 ? (current > 0 ? 100 : 0) : (delta / previous) * 100;
      return { delta, percent };
    };

    const reviewTrend = buildTrend(reviewsThisWeek, reviewsPrevWeek);
    const contactTrend = buildTrend(contactsThisWeek, contactsPrevWeek);

    const reviewActiveEmails = await prisma.review.findMany({
      where: { isDeleted: false, createdAt: { gte: weekSince } },
      distinct: ["email"],
      select: { email: true },
    });

    const contactActiveEmails = await prisma.customerCooperation.findMany({
      where: { createdAt: { gte: weekSince } },
      distinct: ["email"],
      select: { email: true },
    });

    const activeEmailSet = new Set(
      [...reviewActiveEmails, ...contactActiveEmails]
        .map((item) => item.email)
        .filter((value): value is string => Boolean(value)),
    );

    return NextResponse.json({
      summary: {
        reviewTotal,
        reviewWeekCount: reviewsThisWeek,
        reviewTrendDelta: reviewTrend.delta,
        reviewTrendPercent: reviewTrend.percent,
        avgRating: avgRating._avg.rating ?? 0,
        contactTotal,
        contactWeekCount: contactsThisWeek,
        contactTrendDelta: contactTrend.delta,
        contactTrendPercent: contactTrend.percent,
        activeUsers: activeEmailSet.size,
      },
      trend7d,
      ratingDistribution,
      contactSubjects,
      recentActivity: activity,
    });
  } catch (error) {
    return NextResponse.json({ message: "获取仪表盘数据失败" }, { status: 500 });
  }
}
