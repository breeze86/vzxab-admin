const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const faqItems = [
  {
    question: "CPU风扇转速越高，散热效果就一定越好吗？",
    answer:
      "不一定。更高的转速通常会带来更强的风量，但也会同步提升噪音和震动。对于大多数塔式散热器来说，合理的 PWM 调速曲线比长时间满速运行更重要，建议结合 CPU 满载温度、机箱风道和使用场景综合调校。",
    sortOrder: 1,
    isActive: true,
  },
  {
    question: "更换 CPU 风扇后温度没有明显下降，可能是什么原因？",
    answer:
      "常见原因包括硅脂涂抹不均、散热器底座未压紧、机箱内部热空气排不出去，或者 CPU 本身功耗较高导致单纯换风扇效果有限。建议先检查安装压力和硅脂状态，再确认机箱进出风是否平衡，必要时一并优化机箱风道。",
    sortOrder: 2,
    isActive: true,
  },
  {
    question: "CPU 风扇应该接主板哪个接口？",
    answer:
      "优先接在主板标注为 CPU_FAN 的接口上，这样主板才能正确识别并根据处理器温度自动调速。如果是双风扇或一体式散热方案，再结合 CPU_OPT、AIO_PUMP 等接口按主板说明连接，避免接错导致转速异常或开机报错。",
    sortOrder: 3,
    isActive: true,
  },
  {
    question: "机箱风扇应该怎么布置，散热效果更好？",
    answer:
      "常见做法是前进后出、下进上出，让冷空气从机箱前部或底部进入，再由后部和顶部排出，形成稳定风道。对于高性能平台，建议优先保证进风量充足，同时避免风扇方向混乱导致热空气在机箱内循环。",
    sortOrder: 4,
    isActive: true,
  },
  {
    question: "机箱风扇越多越好吗？",
    answer:
      "不一定。风扇数量增加后，理论上可提升整体换气效率，但如果风道设计不合理、安装位置重复或进出风失衡，反而会增加噪音和积灰。通常应先确保关键位置有有效进出风，再根据机箱空间和硬件发热情况补充风扇。",
    sortOrder: 5,
    isActive: true,
  },
  {
    question: "机箱风扇出现共振或噪音偏大，应该怎么处理？",
    answer:
      "可先检查风扇螺丝是否锁紧、扇框是否与机箱板材直接硬接触，并确认叶片没有碰线材。若主板支持 PWM 或 DC 调速，可适当降低中高转速区间；同时加装减震垫、整理线材、清理灰尘，通常都能明显改善噪音表现。",
    sortOrder: 6,
    isActive: true,
  },
];

async function main() {
  const existingItems = await prisma.faqItem.findMany({
    select: {
      question: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  const existingQuestions = new Set(existingItems.map((item) => item.question));
  const pendingItems = faqItems.filter((item) => !existingQuestions.has(item.question));

  if (!pendingItems.length) {
    console.log("默认 FAQ 数据已存在，跳过初始化。");
    return;
  }

  const maxSortOrder = existingItems.reduce((max, item) => Math.max(max, item.sortOrder), 0);

  await prisma.faqItem.createMany({
    data: pendingItems.map((item, index) => ({
      ...item,
      sortOrder: maxSortOrder + index + 1,
    })),
  });

  console.log(`已新增 ${pendingItems.length} 条默认 FAQ 数据。`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
