import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().startsWith("mongodb", "MONGODB_URI must be a valid MongoDB URI"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters long"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email").optional(),
  ADMIN_PASSWORD: z.string().min(6, "ADMIN_PASSWORD must be at least 6 characters").optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CRON_SECRET: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
