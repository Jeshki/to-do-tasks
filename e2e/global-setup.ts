import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type UserInput = {
  email: string;
  password: string;
  role: "ADMIN" | "EMPLOYEE";
  name: string;
};

async function upsertUser({ email, password, role, name }: UserInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { passwordHash, role, name },
    create: { email: normalizedEmail, passwordHash, role, name },
  });
}

export default async function globalSetup() {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL;
  const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD;

  try {
    const tasks: Promise<void>[] = [];

    if (adminEmail && adminPassword) {
      tasks.push(
        upsertUser({
          email: adminEmail,
          password: adminPassword,
          role: "ADMIN",
          name: "E2E Admin",
        }),
      );
    }

    if (employeeEmail && employeePassword) {
      tasks.push(
        upsertUser({
          email: employeeEmail,
          password: employeePassword,
          role: "EMPLOYEE",
          name: "E2E Employee",
        }),
      );
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  } finally {
    await prisma.$disconnect();
  }
}
