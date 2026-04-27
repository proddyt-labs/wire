import Redis from "ioredis";

export let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on("error", (err) => console.error("[Redis] error:", err));
}

export interface StoredMessage {
  id: string;
  roomId: string;
  authorId: string;
  author: string;
  content: string;
  createdAt: string;
}

export async function saveMessage(msg: StoredMessage): Promise<StoredMessage> {
  if (!redis) throw new Error("Redis not initialized");
  await redis.xadd(
    `wire:messages:${msg.roomId}`,
    "*",
    "id", msg.id,
    "roomId", msg.roomId,
    "authorId", msg.authorId,
    "author", msg.author,
    "content", msg.content,
    "createdAt", msg.createdAt
  );
  return msg;
}

export async function getMessages(roomId: string, limit = 50): Promise<StoredMessage[]> {
  if (!redis) return [];
  const entries = await redis.xrevrange(`wire:messages:${roomId}`, "+", "-", "COUNT", limit);
  return entries.reverse().map(([, fields]) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
    return obj as unknown as StoredMessage;
  });
}

export async function incrUnread(userId: string, roomId: string): Promise<void> {
  if (!redis) return;
  await redis.incr(`wire:unread:${userId}:${roomId}`);
}

export async function clearUnread(userId: string, roomId: string): Promise<void> {
  if (!redis) return;
  await redis.set(`wire:unread:${userId}:${roomId}`, 0);
}

export async function getUnread(userId: string, roomId: string): Promise<number> {
  if (!redis) return 0;
  const val = await redis.get(`wire:unread:${userId}:${roomId}`);
  return parseInt(val ?? "0", 10);
}

export async function clearMessages(roomId: string): Promise<void> {
  if (!redis) return;
  await redis.del(`wire:messages:${roomId}`);
}

export async function deleteRoomData(roomId: string, memberIds: string[]): Promise<void> {
  if (!redis) return;
  const keys = [`wire:messages:${roomId}`, ...memberIds.map((u) => `wire:unread:${u}:${roomId}`)];
  if (keys.length) await redis.del(...keys);
}
