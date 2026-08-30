import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
// Next.js expands unescaped `$name` in .env values, which mangles a raw bcrypt
// hash. Escape `$` so the printed value can be pasted into .env as-is.
console.log(hash.replaceAll("$", "\\$"));
