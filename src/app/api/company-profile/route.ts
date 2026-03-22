import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import {
  COMPANY_PROFILE_SINGLETON_KEY,
  emptyCompanyProfile,
  parseCompanyProfilePayload,
} from "@/lib/company-profile";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { singletonKey: COMPANY_PROFILE_SINGLETON_KEY },
    });

    return NextResponse.json({
      data: profile
        ? {
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            updatedAt: profile.updatedAt,
          }
        : {
            ...emptyCompanyProfile,
            updatedAt: null,
          },
    });
  } catch {
    return NextResponse.json({ message: "获取公司信息失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseCompanyProfilePayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const profile = await prisma.companyProfile.upsert({
      where: { singletonKey: COMPANY_PROFILE_SINGLETON_KEY },
      update: parsed.data,
      create: {
        singletonKey: COMPANY_PROFILE_SINGLETON_KEY,
        ...parsed.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        updatedAt: profile.updatedAt,
      },
    });
  } catch {
    return NextResponse.json({ message: "保存公司信息失败" }, { status: 500 });
  }
}
