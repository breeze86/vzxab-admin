import {
  HeroBannerMediaType,
  HeroBannerVideoPlayMode,
  Prisma,
  PrismaClient,
} from "@prisma/client";

type BannerDbClient = PrismaClient | Prisma.TransactionClient;

export type BannerInput = {
  title: string;
  summary: string;
  mediaType: HeroBannerMediaType;
  videoPlayMode: HeroBannerVideoPlayMode;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
};

export type BannerParseResult =
  | { ok: true; data: BannerInput }
  | { ok: false; message: string };

const MAX_TITLE_LENGTH = 30;
const MAX_SUMMARY_LENGTH = 200;
const MAX_URL_LENGTH = 500;

const isMediaType = (value: unknown): value is HeroBannerMediaType =>
  value === HeroBannerMediaType.IMAGE || value === HeroBannerMediaType.VIDEO;

const isVideoPlayMode = (value: unknown): value is HeroBannerVideoPlayMode =>
  value === HeroBannerVideoPlayMode.HOVER || value === HeroBannerVideoPlayMode.AUTO;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalUrl = (value: unknown) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const clampPosition = (value: number, max: number) => Math.max(1, Math.min(value, max));

export const parseBannerPayload = (body: unknown): BannerParseResult => {
  const source = typeof body === "object" && body ? body : {};
  const title = normalizeText((source as Record<string, unknown>).title);
  const summary = normalizeText((source as Record<string, unknown>).summary);
  const mediaType = (source as Record<string, unknown>).mediaType;
  const videoPlayMode = (source as Record<string, unknown>).videoPlayMode;
  const imageUrl = normalizeOptionalUrl((source as Record<string, unknown>).imageUrl);
  const videoUrl = normalizeOptionalUrl((source as Record<string, unknown>).videoUrl);
  const videoPosterUrl = normalizeOptionalUrl((source as Record<string, unknown>).videoPosterUrl);
  const linkUrl = normalizeText((source as Record<string, unknown>).linkUrl);
  const sortOrderValue = Number((source as Record<string, unknown>).sortOrder);
  const isActive = Boolean((source as Record<string, unknown>).isActive);

  if (!title) {
    return { ok: false, message: "横幅标题不能为空" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, message: `横幅标题不能超过 ${MAX_TITLE_LENGTH} 个字符` };
  }
  if (!summary) {
    return { ok: false, message: "横幅描述不能为空" };
  }
  if (summary.length > MAX_SUMMARY_LENGTH) {
    return { ok: false, message: `横幅描述不能超过 ${MAX_SUMMARY_LENGTH} 个字符` };
  }
  if (!isMediaType(mediaType)) {
    return { ok: false, message: "无效的媒体类型" };
  }
  if (!linkUrl) {
    return { ok: false, message: "跳转链接不能为空" };
  }
  if (linkUrl.length > MAX_URL_LENGTH) {
    return { ok: false, message: `跳转链接不能超过 ${MAX_URL_LENGTH} 个字符` };
  }
  if (!Number.isFinite(sortOrderValue) || !Number.isInteger(sortOrderValue) || sortOrderValue < 1) {
    return { ok: false, message: "显示顺序必须是大于 0 的整数" };
  }

  if (mediaType === HeroBannerMediaType.IMAGE) {
    if (!imageUrl) {
      return { ok: false, message: "图片横幅必须填写图片地址" };
    }
    if (imageUrl.length > MAX_URL_LENGTH) {
      return { ok: false, message: `图片地址不能超过 ${MAX_URL_LENGTH} 个字符` };
    }
  }

  if (mediaType === HeroBannerMediaType.VIDEO) {
    if (!videoUrl) {
      return { ok: false, message: "视频横幅必须填写视频地址" };
    }
    if (videoUrl.length > MAX_URL_LENGTH) {
      return { ok: false, message: `视频地址不能超过 ${MAX_URL_LENGTH} 个字符` };
    }
    if (videoPosterUrl && videoPosterUrl.length > MAX_URL_LENGTH) {
      return { ok: false, message: `视频封面地址不能超过 ${MAX_URL_LENGTH} 个字符` };
    }
  }

  return {
    ok: true,
    data: {
      title,
      summary,
      mediaType,
      videoPlayMode: isVideoPlayMode(videoPlayMode)
        ? videoPlayMode
        : HeroBannerVideoPlayMode.HOVER,
      imageUrl: mediaType === HeroBannerMediaType.IMAGE ? imageUrl : null,
      videoUrl: mediaType === HeroBannerMediaType.VIDEO ? videoUrl : null,
      videoPosterUrl: mediaType === HeroBannerMediaType.VIDEO ? videoPosterUrl : null,
      linkUrl,
      sortOrder: sortOrderValue,
      isActive,
    },
  };
};

export const getOrderedBannerIds = async (db: BannerDbClient, excludeId?: number) => {
  const rows = await db.heroBanner.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  return rows.map((item) => item.id);
};

export const insertBannerIdAt = (ids: number[], bannerId: number, targetSortOrder: number) => {
  const nextIds = [...ids];
  const targetIndex = clampPosition(targetSortOrder, nextIds.length + 1) - 1;
  nextIds.splice(targetIndex, 0, bannerId);
  return nextIds;
};

export const resequenceBannerSortOrders = async (db: BannerDbClient, ids: number[]) => {
  for (const [index, id] of ids.entries()) {
    await db.heroBanner.update({
      where: { id },
      data: { sortOrder: index + 1 },
    });
  }
};
