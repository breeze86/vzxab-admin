import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import { getOrderedBannerIds, resequenceBannerSortOrders } from "@/lib/banner";

type ReorderAction = "move_up" | "move_down" | "move_top" | "move_bottom";

const isAction = (value: unknown): value is ReorderAction =>
  value === "move_up" ||
  value === "move_down" ||
  value === "move_top" ||
  value === "move_bottom";

const move = (ids: number[], fromIndex: number, toIndex: number) => {
  const nextIds = [...ids];
  const [current] = nextIds.splice(fromIndex, 1);
  nextIds.splice(toIndex, 0, current);
  return nextIds;
};

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const bannerId = Number(body?.bannerId);
    const action = body?.action;

    if (!bannerId || Number.isNaN(bannerId)) {
      return NextResponse.json({ message: "无效的 Banner ID" }, { status: 400 });
    }
    if (!isAction(action)) {
      return NextResponse.json({ message: "无效的排序动作" }, { status: 400 });
    }

    const changed = await prisma.$transaction(async (tx) => {
      const ids = await getOrderedBannerIds(tx);
      const currentIndex = ids.findIndex((id) => id === bannerId);
      if (currentIndex === -1) {
        return null;
      }

      let nextIds = ids;
      if (action === "move_up" && currentIndex > 0) {
        nextIds = move(ids, currentIndex, currentIndex - 1);
      }
      if (action === "move_down" && currentIndex < ids.length - 1) {
        nextIds = move(ids, currentIndex, currentIndex + 1);
      }
      if (action === "move_top" && currentIndex > 0) {
        nextIds = move(ids, currentIndex, 0);
      }
      if (action === "move_bottom" && currentIndex < ids.length - 1) {
        nextIds = move(ids, currentIndex, ids.length - 1);
      }

      await resequenceBannerSortOrders(tx, nextIds);
      return true;
    });

    if (changed === null) {
      return NextResponse.json({ message: "Banner 不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "调整 Banner 顺序失败" }, { status: 500 });
  }
}

