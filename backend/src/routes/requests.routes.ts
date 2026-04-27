import { Router } from "express";
import { requireAuth, getCurrentUser } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { canCommunicate } from "../lib/groups.js";
import { getIO } from "../lib/socket.js";

const router = Router();

router.use(requireAuth);

// GET /api/requests — solicitações pendentes recebidas
router.get("/", async (req, res) => {
  const user = getCurrentUser(req);
  const requests = await prisma.conversationRequest.findMany({
    where: { toUserId: user.id, status: "pending" },
    include: { fromUser: { select: { id: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    requests.map((r) => ({
      id: r.id,
      fromUser: r.fromUser,
      status: r.status,
      createdAt: r.createdAt,
    }))
  );
});

// POST /api/requests — envia solicitação
router.post("/", async (req, res) => {
  const user = getCurrentUser(req);
  const { toUserId } = req.body as { toUserId?: string };
  if (!toUserId) { res.status(400).json({ error: "toUserId required" }); return; }
  if (toUserId === user.id) { res.status(400).json({ error: "não pode solicitar a si mesmo" }); return; }

  const already = await canCommunicate(user.id, toUserId);
  if (already) { res.status(400).json({ error: "already_can_communicate" }); return; }

  const existing = await prisma.conversationRequest.findFirst({
    where: {
      OR: [
        { fromUserId: user.id, toUserId },
        { fromUserId: toUserId, toUserId: user.id },
      ],
    },
  });
  if (existing) { res.status(409).json({ error: "request_already_exists", id: existing.id }); return; }

  const request = await prisma.conversationRequest.create({
    data: { fromUserId: user.id, toUserId },
    include: { fromUser: { select: { id: true, username: true } } },
  });

  getIO()?.to(toUserId).emit("conversation_request", {
    id: request.id,
    fromUser: request.fromUser,
    createdAt: request.createdAt,
  });

  res.status(201).json({ id: request.id, status: request.status });
});

// PATCH /api/requests/:id — aceitar ou rejeitar
router.patch("/:id", async (req, res) => {
  const user = getCurrentUser(req);
  const { status } = req.body as { status?: string };
  if (status !== "accepted" && status !== "rejected") {
    res.status(400).json({ error: "status deve ser accepted ou rejected" });
    return;
  }

  const request = await prisma.conversationRequest.findUnique({ where: { id: req.params.id } });
  if (!request) { res.status(404).json({ error: "not_found" }); return; }
  if (request.toUserId !== user.id) { res.status(403).json({ error: "apenas o destinatário pode responder" }); return; }
  if (request.status !== "pending") { res.status(400).json({ error: "solicitação já respondida" }); return; }

  await prisma.conversationRequest.update({ where: { id: req.params.id }, data: { status } });

  if (status === "accepted") {
    getIO()?.to(request.fromUserId).emit("request_accepted", {
      requestId: request.id,
      byUserId: user.id,
      byUsername: user.username,
    });
  }

  res.json({ message: "atualizado" });
});

export default router;
