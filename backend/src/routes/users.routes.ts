import { Router } from "express";
import { requireAuth, getCurrentUser } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { canCommunicate } from "../lib/groups.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = getCurrentUser(req);
  const q = (req.query.q as string | undefined)?.trim();

  // Quando há query, busca por username (para DM modal)
  if (q) {
    const users = await prisma.user.findMany({
      where: { id: { not: user.id }, username: { contains: q, mode: "insensitive" } },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
      take: 10,
    });
    res.json(users);
    return;
  }

  // Sem query: retorna usuários dos mesmos grupos com flag canChat
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { groups: true } });
  const myGroups = me?.groups ?? [];

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      ...(myGroups.length ? { groups: { hasSome: myGroups } } : {}),
    },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
    take: 100,
  });

  const withCanChat = await Promise.all(
    candidates.map(async (u) => ({
      ...u,
      canChat: await canCommunicate(user.id, u.id),
    }))
  );

  res.json(withCanChat);
});

export default router;
