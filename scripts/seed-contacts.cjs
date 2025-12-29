const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const names = [
  "陈明",
  "赵敏",
  "孙磊",
  "周婷",
  "郑浩",
  "吴敏",
  "高杰",
  "何静",
  "马超",
  "唐雪",
  "许峰",
  "郭丽",
  "曹宇",
  "邓琳",
  "蒋毅",
  "罗欣",
  "苏楠",
  "彭宇",
  "叶晨",
  "范晓",
];

const emails = [
  "chenming@example.com",
  "zhaomin@example.com",
  "sunlei@example.com",
  "zhouting@example.com",
  "zhenghao@example.com",
  "wumin@example.com",
  "gaojie@example.com",
  "hejing@example.com",
  "machao@example.com",
  "tangxue@example.com",
  "xufeng@example.com",
  "guoli@example.com",
  "caoyu@example.com",
  "denglin@example.com",
  "jiangyi@example.com",
  "luoxin@example.com",
  "sunan@example.com",
  "pengyu@example.com",
  "yechen@example.com",
  "fanxiao@example.com",
];

const subjects = [
  "产品咨询",
  "技术支持",
  "合作洽谈",
  "功能建议",
  "价格咨询",
  "售后保修",
  "发票开具",
  "购买咨询",
];

const messages = [
  "希望了解企业版的功能差异和定价区间，能否提供一份详细的方案说明？",
  "我们在配置角色权限时遇到问题，部分成员无法看到报表，请协助排查。",
  "公司近期有数字化升级计划，想了解合作模式与实施周期。",
  "建议增加更多可视化图表，以及自定义指标看板的功能。",
  "请提供标准报价和是否支持按年/按月付费的说明。",
  "希望安排一次线上演示，重点关注数据看板与审批流程。",
  "账号登录提示异常，请协助重置并确认安全策略。",
  "需要开具发票，请说明流程与所需资料。",
  "计划从旧系统迁移数据，想了解数据导入与字段映射方案。",
  "我们需要对接API接口，请提供文档与鉴权方式说明。",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const buildContact = (index) => {
  const name = names[index % names.length];
  const email = emails[index % emails.length];
  const subject = pick(subjects);
  const message = pick(messages);
  const daysAgo = 1 + Math.floor(Math.random() * 45);
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return {
    name,
    email,
    subject,
    message,
    createdAt,
  };
};

async function main() {
  const data = Array.from({ length: 20 }, (_, index) => buildContact(index));
  await prisma.customerCooperation.createMany({ data });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
