const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const [emailArg, passwordArg, nameArg, roleArg] = process.argv.slice(2);

if (!emailArg || !passwordArg) {
  console.error("Usage: node scripts/create-user.cjs <email> <password> [name] [role]");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg;
const name = nameArg ? nameArg.trim() : null;
const roleInput = roleArg ? roleArg.trim().toUpperCase() : "EMPLOYEE";
const allowedRoles = new Set(["ADMIN", "EMPLOYEE"]);
if (!allowedRoles.has(roleInput)) {
  console.error("Role must be ADMIN or EMPLOYEE");
  process.exit(1);
}
const role = roleInput;

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role },
    create: { email, passwordHash, name, role },
  });

  console.log(`User ready: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
