import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { detectDownloadMetadata, downloadCenterDefaults } from "@/lib/download-center";

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const downloadUrl =
      typeof body?.downloadUrl === "string" ? body.downloadUrl.trim() : "";

    if (!downloadUrl) {
      return NextResponse.json({ message: "下载链接不能为空" }, { status: 400 });
    }

    const detected = await detectDownloadMetadata(downloadUrl);
    const detectedFileType = Boolean(detected.fileType);
    const detectedFileSize = Boolean(detected.fileSize);
    const fileType = detected.fileType ?? downloadCenterDefaults.fileType;
    const fileSize = detected.fileSize ?? downloadCenterDefaults.fileSize;

    return NextResponse.json({
      success: true,
      data: {
        fileType,
        fileSize,
        fileName: detected.fileName,
        detected: detected.detected,
        detectedFileType,
        detectedFileSize,
        reason: detected.reason,
      },
    });
  } catch {
    return NextResponse.json({ message: "自动识别文档信息失败" }, { status: 500 });
  }
}
