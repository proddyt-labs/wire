import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { io, Socket } from "socket.io-client";

export const useSocketStore = defineStore("socket", () => {
  const socket = ref<Socket | null>(null);
  const unreadByRoom = ref<Record<string, number>>({});
  const pendingRequests = ref<any[]>([]);

  const totalUnread = computed(() =>
    Object.values(unreadByRoom.value).reduce((a, b) => a + b, 0)
  );

  function connect(token: string) {
    if (socket.value?.connected) return;
    const serverUrl = window.location.origin;
    socket.value = io(serverUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.value.on("unread_update", ({ roomId, roomUnread }: { roomId: string; roomUnread: number }) => {
      unreadByRoom.value = { ...unreadByRoom.value, [roomId]: roomUnread };
    });

    socket.value.on("conversation_request", (req: any) => {
      pendingRequests.value = [...pendingRequests.value, req];
    });

    socket.value.on("disconnect", () => {
      socket.value = null;
    });
  }

  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
  }

  function onNewMessage(handler: (msg: any) => void) {
    socket.value?.on("new_message", handler);
    return () => socket.value?.off("new_message", handler);
  }

  function sendMessage(roomId: string, content: string) {
    socket.value?.emit("send_message", { roomId, content });
  }

  function markRead(roomId: string) {
    if (unreadByRoom.value[roomId]) {
      unreadByRoom.value = { ...unreadByRoom.value, [roomId]: 0 };
    }
    socket.value?.emit("mark_read", { roomId });
  }

  function emitTyping(roomId: string, username: string) {
    socket.value?.emit("typing", { roomId, username });
  }

  function emitStopTyping(roomId: string, username: string) {
    socket.value?.emit("stop-typing", { roomId, username });
  }

  function joinRoom(roomId: string) {
    socket.value?.emit("join-room", roomId);
  }

  function leaveRoom(roomId: string) {
    socket.value?.emit("leave-room", roomId);
  }

  return {
    socket,
    unreadByRoom,
    pendingRequests,
    totalUnread,
    connect,
    disconnect,
    onNewMessage,
    sendMessage,
    markRead,
    emitTyping,
    emitStopTyping,
    joinRoom,
    leaveRoom,
  };
});
