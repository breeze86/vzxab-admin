export type CompanyProfileInput = {
  phone: string;
  email: string;
  address: string;
};

export type CompanyProfileParseResult =
  | { ok: true; data: CompanyProfileInput }
  | { ok: false; message: string };

export const COMPANY_PROFILE_SINGLETON_KEY = "default";

const MAX_PHONE_LENGTH = 100;
const MAX_EMAIL_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 500;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const parseCompanyProfilePayload = (body: unknown): CompanyProfileParseResult => {
  const source = typeof body === "object" && body ? body : {};
  const phone = normalizeText((source as Record<string, unknown>).phone);
  const email = normalizeText((source as Record<string, unknown>).email);
  const address = normalizeText((source as Record<string, unknown>).address);

  if (phone.length > MAX_PHONE_LENGTH) {
    return { ok: false, message: `公司电话不能超过 ${MAX_PHONE_LENGTH} 个字符` };
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return { ok: false, message: `公司邮箱不能超过 ${MAX_EMAIL_LENGTH} 个字符` };
  }
  if (email && !isEmail(email)) {
    return { ok: false, message: "公司邮箱格式不正确" };
  }
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, message: `公司地址不能超过 ${MAX_ADDRESS_LENGTH} 个字符` };
  }

  return {
    ok: true,
    data: {
      phone,
      email,
      address,
    },
  };
};

export const emptyCompanyProfile = {
  phone: "",
  email: "",
  address: "",
};
