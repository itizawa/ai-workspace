import { DEFAULT_EMPLOYEES } from "@hatchery/common";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** ログインユーザー（開発用）。本文の例示 `dev-user` は #26 以来の実在ユーザー `testuser` に対応する（設計書 §7）。 */
const LOGIN_USER_ID = "testuser";
/** ログインユーザーに紐づく Employee の id（#49）。 */
const LOGIN_USER_EMPLOYEE_ID = "emp-testuser";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("本番環境ではシードを実行しません");
    return;
  }

  const passwordHash = await bcrypt.hash("testpass", 10);
  await prisma.user.upsert({
    where: { id: LOGIN_USER_ID },
    update: {},
    create: {
      id: LOGIN_USER_ID,
      displayName: "Test User",
      passwordHash,
    },
  });

  // AI 社員（既定 3 名）は isBot=true / userId=null（#49）。common を単一情報源にする。
  for (const employee of DEFAULT_EMPLOYEES) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: { isBot: true, userId: null },
      create: {
        id: employee.id,
        displayName: employee.displayName,
        role: employee.role,
        isBot: true,
      },
    });
  }

  // ログインユーザーに対応する Employee は isBot=false / userId=<user.id>（#49）。
  await prisma.employee.upsert({
    where: { id: LOGIN_USER_EMPLOYEE_ID },
    update: { isBot: false, userId: LOGIN_USER_ID },
    create: {
      id: LOGIN_USER_EMPLOYEE_ID,
      displayName: "Test User",
      isBot: false,
      userId: LOGIN_USER_ID,
    },
  });

  console.log(
    `シードを作成しました: ユーザー ${LOGIN_USER_ID} / testpass、AI 社員 ${DEFAULT_EMPLOYEES.length} 名、ユーザー社員 ${LOGIN_USER_EMPLOYEE_ID}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
