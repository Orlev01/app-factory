import { z } from "zod";

const isDev = process.env.NODE_ENV === "development";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL").or(
    isDev ? z.literal("").transform(() => "http://localhost:3000") : z.never()
  ).default(isDev ? "http://localhost:3000" : undefined as unknown as string),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, "NEXT_PUBLIC_APP_NAME is required"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").or(
    isDev ? z.literal("").transform(() => "http://localhost:3000") : z.never()
  ).default(isDev ? "http://localhost:3000" : undefined as unknown as string),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional().default("https://us.i.posthog.com"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const formatted = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Missing or invalid environment variables:\n${formatted}\n\n` +
      "Hint: Copy .env.example to .env.local and fill in the values, " +
      "or run the CLI with `appfactory create`."
  );
}

export const env = result.data;
