import { Router } from "express";
import { requireAuth, getCurrentUser } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const user = getCurrentUser(req);
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { _count: { select: { messages: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(rooms.map((r) => ({ id: r.id, name: r.name, isDirect: r.isDirect, messageCount: r._count.messages })));
});

router.post("/", async (req, res) => {
  const user = getCurrentUser(req);
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const room = await prisma.room.create({
    data: { name: name.trim(), members: { create: { userId: user.id } } },
  });
  res.status(201).json({ id: room.id, name: room.name, isDirect: room.isDirect });
});

router.get("/:id/messages", async (req, res) => {
  const user = getCurrentUser(req);
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "Not a member" });
    return;
  }
  const messages = await prisma.message.findMany({
    where: { roomId: req.params.id },
    include: { author: { select: { username: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(messages.map((m) => ({ id: m.id, content: m.content, author: m.author.username, createdAt: m.createdAt })));
});

router.post("/:id/messages", async (req, res) => {
  const user = getCurrentUser(req);
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    res.status(400).json({ error: "content required" });
    return;
  }
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "Not a member" });
    return;
  }
  const message = await prisma.message.create({
    data: { roomId: req.params.id, authorId: user.id, content: content.trim() },
    include: { author: { select: { username: true } } },
  });
  res.status(201).json({ id: message.id, content: message.content, author: message.author.username, createdAt: message.createdAt });
});

router.post("/:id/join", async (req, res) => {
  const user = getCurrentUser(req);
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
    create: { roomId: req.params.id, userId: user.id },
    update: {},
  });
  res.json({ message: "joined" });
});

export default router;
