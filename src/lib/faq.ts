import { Prisma, PrismaClient } from "@prisma/client";

type FaqDbClient = PrismaClient | Prisma.TransactionClient;

export type FaqInput = {
  question: string;
  questionEn?: string | null;
  answer: string;
  answerEn?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type FaqParseResult =
  | { ok: true; data: FaqInput }
  | { ok: false; message: string };

const MAX_QUESTION_LENGTH = 200;
const MAX_QUESTION_EN_LENGTH = 200;
const MAX_ANSWER_LENGTH = 5000;
const MAX_ANSWER_EN_LENGTH = 5000;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const clampPosition = (value: number, max: number) => Math.max(1, Math.min(value, max));

export const parseFaqPayload = (body: unknown): FaqParseResult => {
  const source = typeof body === "object" && body ? body : {};
  const question = normalizeText((source as Record<string, unknown>).question);
  const questionEn = normalizeText((source as Record<string, unknown>).questionEn) || null;
  const answer = normalizeText((source as Record<string, unknown>).answer);
  const answerEn = normalizeText((source as Record<string, unknown>).answerEn) || null;
  const sortOrderValue = Number((source as Record<string, unknown>).sortOrder);
  const isActive = Boolean((source as Record<string, unknown>).isActive);

  if (!question) {
    return { ok: false, message: "问题标题不能为空" };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, message: `问题标题不能超过 ${MAX_QUESTION_LENGTH} 个字符` };
  }
  if (questionEn && questionEn.length > MAX_QUESTION_EN_LENGTH) {
    return { ok: false, message: `英文问题标题不能超过 ${MAX_QUESTION_EN_LENGTH} 个字符` };
  }
  if (!answer) {
    return { ok: false, message: "回答内容不能为空" };
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return { ok: false, message: `回答内容不能超过 ${MAX_ANSWER_LENGTH} 个字符` };
  }
  if (answerEn && answerEn.length > MAX_ANSWER_EN_LENGTH) {
    return { ok: false, message: `英文回答内容不能超过 ${MAX_ANSWER_EN_LENGTH} 个字符` };
  }
  if (!Number.isFinite(sortOrderValue) || !Number.isInteger(sortOrderValue) || sortOrderValue < 1) {
    return { ok: false, message: "显示顺序必须是大于 0 的整数" };
  }

  return {
    ok: true,
    data: {
      question,
      questionEn,
      answer,
      answerEn,
      sortOrder: sortOrderValue,
      isActive,
    },
  };
};

export const getOrderedFaqIds = async (db: FaqDbClient, excludeId?: number) => {
  const rows = await db.faqItem.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  return rows.map((item) => item.id);
};

export const insertFaqIdAt = (ids: number[], faqId: number, targetSortOrder: number) => {
  const nextIds = [...ids];
  const targetIndex = clampPosition(targetSortOrder, nextIds.length + 1) - 1;
  nextIds.splice(targetIndex, 0, faqId);
  return nextIds;
};

export const resequenceFaqSortOrders = async (db: FaqDbClient, ids: number[]) => {
  for (const [index, id] of ids.entries()) {
    await db.faqItem.update({
      where: { id },
      data: { sortOrder: index + 1 },
    });
  }
};
