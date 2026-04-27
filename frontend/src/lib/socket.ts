import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(window.location.origin, { withCredentials: true });
  }
  return _socket;
}
