import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { setIO } from "./lib/socket.js";
import { redis, saveMessage, getUnread, incrUnread, clearUnread } from "./lib/redis.js";

const GATE_URL = process.env.GATE_URL ?? "http://localhost:3100";

export function setupSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.FRONTEND_URL ?? "*", credentials: true },
  });
  setIO(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));
    try {
      const resp = await fetch(`${GATE_URL}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return next(new Error("unauthorized"));
      const info = await resp.json() as { sub: string; username: string };
      const user = await prisma.user.findUnique({ where: { gateId: info.sub } });
      if (!user) return next(new Error("user_not_found"));
      socket.data.userId = user.id;
      socket.data.username = user.username;
      next();
    } catch {
      next(new Error("auth_error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId: string = socket.data.userId;

    socket.join(userId);
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    memberships.forEach((m) => socket.join(`room:${m.roomId}`));

    socket.on("join-room", (roomId: string) => socket.join(`room:${roomId}`));
    socket.on("leave-room", (roomId: string) => socket.leave(`room:${roomId}`));
    socket.on("typing", ({ roomId, username }: { roomId: string; username: string }) => {
      socket.to(`room:${roomId}`).emit("user-typing", { username });
    });
    socket.on("stop-typing", ({ roomId, username }: { roomId: string; username: string }) => {
      socket.to(`room:${roomId}`).emit("user-stop-typing", { username });
    });

    socket.on("send_message", async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!content?.trim()) return;
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member || !member.canWrite) return;

      const msgId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const payload = {
        id: msgId,
        roomId,
        authorId: userId,
        author: socket.data.username as string,
        content: content.trim(),
        createdAt,
      };

      if (redis) {
        await saveMessage(payload);
      } else {
        await prisma.message.create({
          data: { id: msgId, roomId, authorId: userId, content: content.trim() },
        });
      }

      io.to(`room:${roomId}`).emit("new_message", payload);

      const others = await prisma.roomMember.findMany({
        where: { roomId, userId: { not: userId } },
        select: { userId: true },
      });
      for (const m of others) {
        if (redis) {
          await incrUnread(m.userId, roomId);
          const count = await getUnread(m.userId, roomId);
          io.to(m.userId).emit("unread_update", { roomId, roomUnread: count });
        } else {
          const updated = await prisma.roomMember.update({
            where: { roomId_userId: { roomId, userId: m.userId } },
            data: { unreadCount: { increment: 1 } },
          });
          io.to(m.userId).emit("unread_update", { roomId, roomUnread: updated.unreadCount });
        }
        // Web Push
        const gateUrl = process.env.GATE_URL ?? "http://localhost:3100";
        const internalKey = process.env.GATE_INTERNAL_KEY;
        if (internalKey) {
          fetch(`${gateUrl}/push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Internal-Key": internalKey },
            body: JSON.stringify({
              userId: m.userId,
              payload: {
                title: `«·» ${socket.data.username}`,
                body: content.trim().substring(0, 100),
                url: "https://wire.proddyt.site",
              },
            }),
          }).catch(() => {});
        }
      }
    });

    socket.on("mark_read", async ({ roomId }: { roomId: string }) => {
      if (redis) {
        await clearUnread(userId, roomId);
      } else {
        await prisma.roomMember.update({
          where: { roomId_userId: { roomId, userId } },
          data: { unreadCount: 0 },
        });
      }
      socket.emit("unread_update", { roomId, roomUnread: 0 });
    });
  });

  return io;
}
