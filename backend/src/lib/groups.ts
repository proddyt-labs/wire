import { prisma } from "./prisma.js";

export async function canCommunicate(userAId: string, userBId: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId }, select: { groups: true } }),
    prisma.user.findUnique({ where: { id: userBId }, select: { groups: true } }),
  ]);
  if (!a || !b) return false;
  if (a.groups.includes("admin") || b.groups.includes("admin")) return true;
  if (a.groups.some((g) => b.groups.includes(g))) return true;
  const accepted = await prisma.conversationRequest.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: userAId, toUserId: userBId },
        { fromUserId: userBId, toUserId: userAId },
      ],
    },
  });
  return !!accepted;
}
