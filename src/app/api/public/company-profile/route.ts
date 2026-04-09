import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") || "zh";

    const profile = await prisma.companyProfile.findUnique({
      where: { singletonKey: "default" },
    });

    if (!profile) {
      return NextResponse.json({
        data: {
          phone: "",
          email: "",
          address: "",
        },
      });
    }

    // 根据语言返回对应字段
    const mappedProfile = {
      phone: profile.phone,
      email: profile.email,
      address:
        lang === "en" && (profile as { addressEn?: string }).addressEn
          ? (profile as { addressEn?: string }).addressEn!
          : profile.address,
    };

    return NextResponse.json({ data: mappedProfile });
  } catch {
    return NextResponse.json({ message: "获取公司信息失败" }, { status: 500 });
  }
}
