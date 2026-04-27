import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import authRoutes from "./routes/auth.routes.js";
import roomsRoutes from "./routes/rooms.routes.js";
import usersRoutes from "./routes/users.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import { setupSocket } from "./socket.js";

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3003;

// ── Socket.io (authenticated)
setupSocket(httpServer);

app.use(cors({ origin: process.env.FRONTEND_URL ?? "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "wire", ts: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/requests", requestsRoutes);

// --- Internal widget endpoints (Gate only, no public access) ---
app.get("/internal/widget/rooms", async (req, res) => {
  const gateId = req.query.gateId as string;
  if (!gateId) { res.status(400).json({ error: "gateId required" }); return; }
  const { prisma } = await import("./lib/prisma.js");
  const user = await prisma.user.findUnique({ where: { gateId } });
  if (!user) { res.json([]); return; }
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { members: { include: { user: { select: { username: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(rooms.map((r) => {
    if (r.isDirect) {
      const other = r.members.find((m) => m.userId !== user.id);
      return { id: r.id, name: other?.user.username ?? r.name, isDirect: true };
    }
    return { id: r.id, name: r.name, isDirect: false };
  }));
});

app.post("/internal/widget/message", async (req, res) => {
  const gateId = req.query.gateId as string;
  if (!gateId) { res.status(400).json({ error: "gateId required" }); return; }
  const { roomId, content } = req.body as { roomId?: string; content?: string };
  if (!roomId || !content?.trim()) { res.status(400).json({ error: "roomId and content required" }); return; }
  const { prisma } = await import("./lib/prisma.js");
  const user = await prisma.user.findUnique({ where: { gateId } });
  if (!user) { res.status(404).json({ error: "user_not_found" }); return; }
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!member) { res.status(403).json({ error: "not_a_member" }); return; }
  if (!member.canWrite) { res.status(403).json({ error: "read_only" }); return; }
  const message = await prisma.message.create({
    data: { roomId, authorId: user.id, content: content.trim() },
    select: { id: true, content: true, createdAt: true },
  });
  res.status(201).json(message);
});

httpServer.listen(PORT, () => {
  console.log(`[Wire API] running on port ${PORT}`);
});
