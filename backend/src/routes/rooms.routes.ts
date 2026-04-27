import { Router } from "express";
import { requireAuth, getCurrentUser } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { getIO } from "../lib/socket.js";
import { canCommunicate } from "../lib/groups.js";

const router = Router();

router.use(requireAuth);

// List rooms user is a member of
router.get("/", async (req, res) => {
  const user = getCurrentUser(req);
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: user.id } }, isDirect: false },
    include: {
      _count: { select: { messages: true } },
      members: { where: { userId: user.id }, select: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    rooms.map((r) => ({
      id: r.id,
      name: r.name,
      isDirect: r.isDirect,
      messageCount: r._count.messages,
      myRole: r.members[0]?.role ?? "MEMBER",
    }))
  );
});

// List DMs
router.get("/dms", async (req, res) => {
  const user = getCurrentUser(req);
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: user.id } }, isDirect: true },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    rooms.map((r) => {
      const other = r.members.find((m) => m.userId !== user.id);
      return {
        id: r.id,
        name: other?.user.username ?? r.name,
        isDirect: true,
        messageCount: r._count.messages,
        otherUserId: other?.user.id,
      };
    })
  );
});

// Start or get existing DM (verifica canCommunicate)
router.post("/dms", async (req, res) => {
  const user = getCurrentUser(req);
  const { targetUserId } = req.body as { targetUserId?: string };
  if (!targetUserId) { res.status(400).json({ error: "targetUserId required" }); return; }

  const allowed = await canCommunicate(user.id, targetUserId);
  if (!allowed) {
    res.status(403).json({ error: "no_common_group", hint: "envie uma solicitação de conversa primeiro" });
    return;
  }

  const existing = await prisma.room.findFirst({
    where: {
      isDirect: true,
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
  });
  if (existing) { res.json({ id: existing.id, name: existing.name, isDirect: true }); return; }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  const room = await prisma.room.create({
    data: {
      name: `${user.username}, ${target.username}`,
      isDirect: true,
      type: "dm",
      members: {
        create: [
          { userId: user.id, role: "OWNER" },
          { userId: targetUserId, role: "MEMBER" },
        ],
      },
    },
  });
  res.status(201).json({ id: room.id, name: room.name, isDirect: true });
});

// Create room
router.post("/", async (req, res) => {
  const user = getCurrentUser(req);
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  const room = await prisma.room.create({
    data: {
      name: name.trim(),
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  res.status(201).json({ id: room.id, name: room.name, isDirect: room.isDirect });
});

// Get room details + members
router.get("/:id", async (req, res) => {
  const user = getCurrentUser(req);
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member) { res.status(403).json({ error: "Not a member" }); return; }
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: { user: { select: { id: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!room) { res.status(404).json({ error: "Room not found" }); return; }
  res.json({
    id: room.id,
    name: room.name,
    isDirect: room.isDirect,
    myRole: member.role,
    members: room.members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      role: m.role,
      canWrite: m.canWrite,
    })),
  });
});

// Update room info (owner only)
router.patch("/:id", async (req, res) => {
  const user = getCurrentUser(req);
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member || member.role !== "OWNER") { res.status(403).json({ error: "Owner only" }); return; }
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  const room = await prisma.room.update({ where: { id: req.params.id }, data: { name: name.trim() } });
  res.json({ id: room.id, name: room.name });
});

// Add member to room (owner only)
router.post("/:id/members", async (req, res) => {
  const user = getCurrentUser(req);
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member || member.role !== "OWNER") { res.status(403).json({ error: "Owner only" }); return; }
  const { userId } = req.body as { userId?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: req.params.id, userId } },
    create: { roomId: req.params.id, userId, role: "MEMBER" },
    update: {},
  });
  res.json({ message: "added" });
});

// Update member permissions (owner only)
router.patch("/:id/members/:userId", async (req, res) => {
  const user = getCurrentUser(req);
  const owner = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!owner || owner.role !== "OWNER") { res.status(403).json({ error: "Owner only" }); return; }
  const { role, canWrite } = req.body as { role?: string; canWrite?: boolean };
  const data: Record<string, unknown> = {};
  if (role === "OWNER" || role === "MEMBER") data.role = role;
  if (typeof canWrite === "boolean") data.canWrite = canWrite;
  await prisma.roomMember.update({
    where: { roomId_userId: { roomId: req.params.id, userId: req.params.userId } },
    data,
  });
  res.json({ message: "updated" });
});

// Remove member (owner only)
router.delete("/:id/members/:userId", async (req, res) => {
  const user = getCurrentUser(req);
  const owner = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!owner || owner.role !== "OWNER") { res.status(403).json({ error: "Owner only" }); return; }
  if (req.params.userId === user.id) { res.status(400).json({ error: "Owner cannot remove themselves" }); return; }
  await prisma.roomMember.delete({
    where: { roomId_userId: { roomId: req.params.id, userId: req.params.userId } },
  });
  res.json({ message: "removed" });
});

// Get messages
router.get("/:id/messages", async (req, res) => {
  const user = getCurrentUser(req);
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member) { res.status(403).json({ error: "Not a member" }); return; }
  const { redis, getMessages } = await import("../lib/redis.js");
  if (redis) {
    const msgs = await getMessages(req.params.id, 100);
    res.json(msgs);
  } else {
    const messages = await prisma.message.findMany({
      where: { roomId: req.params.id },
      include: { author: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages.map((m) => ({ id: m.id, content: m.content, author: m.author.username, createdAt: m.createdAt })));
  }
});

// Post message
router.post("/:id/messages", async (req, res) => {
  const user = getCurrentUser(req);
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: user.id } },
  });
  if (!member) { res.status(403).json({ error: "Not a member" }); return; }
  if (!member.canWrite) { res.status(403).json({ error: "Read-only" }); return; }
  const message = await prisma.message.create({
    data: { roomId: req.params.id, authorId: user.id, content: content.trim() },
    include: { author: { select: { username: true } } },
  });
  const payload = { id: message.id, content: message.content, author: message.author.username, createdAt: message.createdAt };
  getIO()?.to(`room:${req.params.id}`).emit("new-message", payload);
  res.status(201).json(payload);
});

// Join room
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
