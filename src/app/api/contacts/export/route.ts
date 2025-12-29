import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

const formatDate = (value: Date) => {
  const iso = value.toISOString();
  return iso.slice(0, 10).replace(/-/g, "/");
};

export async function GET() {
  try {
    const contacts = await prisma.customerCooperation.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        email: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });

    const rows = contacts.map((contact) => ({
      姓名: contact.name,
      邮箱: contact.email,
      主题: contact.subject,
      留言内容: contact.message,
      日期: formatDate(contact.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ["姓名", "邮箱", "主题", "留言内容", "日期"],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "联系信息");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `contacts-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${fileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "导出失败" }, { status: 500 });
  }
}
