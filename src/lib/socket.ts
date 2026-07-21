import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** REST gateway default :8080 — sockets live on realtime :8081 (never Metro). */
function socketBaseUrl() {
  const sock = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (sock) return sock.replace(/\/$/, "");
  const api = (process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
  try {
    const u = new URL(api);
    // If API is gateway :8080, sockets are typically :8081 on same host
    if (u.port === "8080" || !u.port) {
      u.port = "8081";
      return u.toString().replace(/\/$/, "");
    }
  } catch {
    /* fall through */
  }
  return api;
}

async function readAccessToken(): Promise<string | null> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.getItem("sc_access_token");
  } catch {
    return null;
  }
}

export async function connectChatSocket(token?: string | null): Promise<Socket | null> {
  const access = token ?? (await readAccessToken());
  if (!access) return null;
  if (socket?.connected) return socket;
  if (socket) {
    socket.auth = { token: access };
    socket.connect();
    return socket;
  }
  socket = io(socketBaseUrl(), {
    auth: { token: access },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1200,
  });
  return socket;
}

export function joinChatRoom(conversationId: number) {
  socket?.emit("join_chat", { conversation_id: conversationId });
}

export function joinOrderRoom(orderId: number) {
  socket?.emit("join_order", { order_id: orderId });
}

export function emitTyping(conversationId: number, isTyping: boolean) {
  socket?.emit("typing", { conversation_id: conversationId, is_typing: isTyping });
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}

/** Alias used by order tracking screens. */
export const connectSocket = connectChatSocket;
