import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

export interface AppUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

const GATE_URL = process.env.GATE_URL ?? "http://localhost:3100";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];

  try {
    const resp = await fetch(`${GATE_URL}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const info = (await resp.json()) as { sub: string; username: string; email?: string; groups?: string[]; roles?: string[] };
    const isAdmin = (info.roles ?? []).includes("admin");

    let user = await prisma.user.findUnique({ where: { gateId: info.sub } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          gateId: info.sub,
          username: info.username,
          email: info.email ?? `${info.username}@gate.internal`,
          groups: info.groups ?? [],
        },
      });
    } else if (info.groups) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { groups: info.groups },
      });
    }

    req.user = { id: user.id, username: user.username, email: user.email, isAdmin };
    next();
  } catch (err) {
    console.error("Gate auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export function getCurrentUser(req: Express.Request): AppUser {
  if (!req.user) throw new Error("User not set on request");
  return req.user;
}
