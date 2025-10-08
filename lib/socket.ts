import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function socketClient(token?: string) {
  const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "")
  if (socket && token) {
    // If token changed, reconnect
    const authToken = (socket as any).auth?.token
    if (authToken !== token) {
      try {
        socket.disconnect()
      } catch {}
      socket = null
    }
  }
  if (!socket) {
    socket = io(BASE, {
      transports: ["websocket"],
      auth: {
        token: token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : undefined),
      },
    })
  }
  return socket
}
