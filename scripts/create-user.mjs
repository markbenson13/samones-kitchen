import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npm run create-user -- <email> <password> [name]");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email: email.toLowerCase() },
  create: { email: email.toLowerCase(), passwordHash, name: name ?? null },
  update: { passwordHash, ...(name ? { name } : {}) },
});

console.log(`User ready: ${user.email} (id: ${user.id})`);

await prisma.$disconnect();
