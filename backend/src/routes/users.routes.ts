import { Router } from "express";
import { requireAuth, getCurrentUser } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = getCurrentUser(req);
  const users = await prisma.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });
  res.json(users);
});

export default router;
