const { PrismaClient } = require("@prisma/client");
const { sha256 } = require("js-sha256");

const prisma = new PrismaClient();

const hashPasswordDigest = (password) => sha256(password);

const run = async () => {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error(
      "Usage: node scripts/reset-admin-password.cjs <username> <newPassword>"
    );
    process.exit(1);
  }

  const passwordHash = hashPasswordDigest(password);
  const admin = await prisma.admin.update({
    where: { username },
    data: { passwordHash },
  });

  console.log(`Admin password reset: ${admin.username}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
