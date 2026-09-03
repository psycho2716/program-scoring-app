import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { RowDataPacket } from "mysql2";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { authRequired, COOKIE_NAME, signToken } from "../middleware/auth";
import { AuthUser } from "../types";

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  display_name: string | null;
  password_hash: string;
  role: "judge" | "admin";
  judge_number: number | null;
}

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ success: false, error: "Username and password are required" });
      return;
    }

    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, username, display_name, password_hash, role, judge_number FROM users WHERE username = :username",
      { username }
    );

    const user = rows[0];
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      judgeNumber: user.judge_number,
    };

    const token = signToken(authUser);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: authUser,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

router.get("/me", authRequired, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

export default router;
