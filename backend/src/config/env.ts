import dotenv from "dotenv";

dotenv.config();

export const env = {
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "pageant_scoring",
  },
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  cookieSecure: process.env.COOKIE_SECURE === "true",
};
