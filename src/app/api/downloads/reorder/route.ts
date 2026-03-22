import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { getOrderedDownloadIds, resequenceDownloadSortOrders } from "@/lib/download-center";
import prisma from "@/lib/prisma";

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
    const itemId = Number(body?.itemId);
    const action = body?.action;

    if (!itemId || Number.isNaN(itemId)) {
      return NextResponse.json({ message: "无效的下载文档 ID" }, { status: 400 });
    }
    if (!isAction(action)) {
      return NextResponse.json({ message: "无效的排序动作" }, { status: 400 });
    }

    const changed = await prisma.$transaction(async (tx) => {
      const ids = await getOrderedDownloadIds(tx);
      const currentIndex = ids.findIndex((id) => id === itemId);
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

      await resequenceDownloadSortOrders(tx, nextIds);
      return true;
    });

    if (changed === null) {
      return NextResponse.json({ message: "下载文档不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "调整下载文档顺序失败" }, { status: 500 });
  }
}
