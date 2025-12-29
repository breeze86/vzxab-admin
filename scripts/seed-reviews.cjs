const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const names = [
  "张伟",
  "李娜",
  "王强",
  "刘芳",
  "黄磊",
  "赵敏",
  "陈明",
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
];

const emails = [
  "zhangwei@example.com",
  "lina@example.com",
  "wangqiang@example.com",
  "liufang@example.com",
  "huanglei@example.com",
  "zhaomin@example.com",
  "chenming@example.com",
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
];

const productTypes = [
  "机箱风扇",
  "CPU风扇",
  "一体式CPU散热器",
  "塔式风冷散热器",
];

const usageScenarios = [
  "日常办公主机",
  "游戏主机",
  "静音装机",
  "小型ITX机箱",
  "高负载渲染",
  "24小时运行服务器",
  "风道优化装机",
  "双塔散热方案",
];

const positives = [
  "风量充足，机箱内部温度明显下降",
  "噪音控制很好，夜间使用也很安静",
  "PWM调速灵敏，低转速也不闷热",
  "风扇轴承顺滑，运行稳定",
  "安装方便，扣具适配性高",
  "RGB灯效均匀，线材整理也容易",
  "满载下CPU温度更稳，温差收敛",
  "风道优化后整机温度更均衡",
];

const improvements = [
  "希望提供更多尺寸的风扇选项",
  "线材如果更短会更利于理线",
  "满速时还是有一点风噪",
  "扣具说明可以再详细一些",
  "PWM曲线默认值可以更保守",
  "更希望有黑色与白色两套配色",
  "希望补充更多主板ARGB接口支持说明",
  "能增加防震垫会更好",
];

const ratings = [5, 4, 5, 4, 5, 3, 4, 5];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const buildReview = (index) => {
  const name = names[index % names.length];
  const email = emails[index % emails.length];
  const product = pick(productTypes);
  const scenario = pick(usageScenarios);
  const positive = pick(positives);
  const improvement = pick(improvements);
  const rating = pick(ratings);
  const daysAgo = 1 + Math.floor(Math.random() * 60);
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  return {
    name,
    email,
    rating,
    content: `${product}用于${scenario}，${positive}。${
      rating <= 3 ? "整体还可以，但" : "整体体验很不错，"
    }${improvement}。`,
    createdAt,
  };
};

async function main() {
  const data = Array.from({ length: 30 }, (_, index) => buildReview(index));
  await prisma.review.createMany({ data });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
