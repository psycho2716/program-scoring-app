import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser, AppJwtPayload, UserRole } from "../types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE_NAME = "pageant_token";

export function getTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export function signToken(user: AuthUser): string {
  const payload: AppJwtPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    judgeNumber: user.judgeNumber,
  };

  return jwt.sign(payload, env.jwtSecret, { expiresIn: "12h" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as unknown as AppJwtPayload;
    return {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      judgeNumber: decoded.judgeNumber,
    };
  } catch {
    return null;
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

export { COOKIE_NAME };
