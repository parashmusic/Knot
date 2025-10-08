"use client"

import { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Composer } from "./composer"
import { MessageBubble, type ChatMessage } from "./message-bubble"
import { socketClient } from "@/lib/socket"

type Props = {
  me: { id: number; username: string }
  mode: "broadcast" | "dm"
  peerUserId: number | null
}

export function ChatWindow({ me, mode, peerUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<{ userId: number; username: string }[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Load history for DM or Broadcast
  useEffect(() => {
    setMessages([])
    const s = socketClient()
    if (mode === "dm" && peerUserId) {
      s.emit("get-conversation", { withUserId: peerUserId })
      const onHistory = (list: any[]) => {
        const mapped: ChatMessage[] = list.map((m) => ({
          id: m.id,
          from: m.fromUserId,
          to: m.toUserId,
          text: m.message,
          timestamp: m.timestamp,
          status: m.read ? "read" : m.delivered ? "delivered" : "sent",
          kind: "dm",
        }))
        setMessages(mapped)
        // Optionally mark read
        const unreadIds = list.filter((m) => m.toUserId === me.id && !m.read).map((m) => m.id)
        if (unreadIds.length) {
          s.emit("mark-messages-read", { messageIds: unreadIds })
        }
      }
      s.on("conversation-history", onHistory)
      return () => {
        s.off("conversation-history", onHistory)
      }
    }
    if (mode === "broadcast") {
      // For simplicity, just clear and wait for public stream; history available via HTTP if needed
      setMessages([])
    }
  }, [mode, peerUserId, me.id])

  // Real-time events
  useEffect(() => {
    const s = socketClient()
    const onNewPublic = (data: any) => {
      if (mode !== "broadcast") return
      setMessages((prev) =>
        prev.concat({
          id: data.id,
          from: -1,
          to: -1,
          text: `${data.username}: ${data.message}`,
          timestamp: data.timestamp,
          status: "delivered",
          kind: "broadcast",
        }),
      )
    }
    const onDMSent = (data: any) => {
      if (mode !== "dm") return
      const isRelevant =
        (data.from === me.id && data.to === peerUserId) || (data.from === peerUserId && data.to === me.id)
      if (!isRelevant) return
      setMessages((prev) =>
        prev.concat({
          id: data.id,
          from: data.from,
          to: data.to,
          text: data.message,
          timestamp: data.timestamp,
          status: data.status === "delivered" ? "delivered" : "sent",
          kind: "dm",
        }),
      )
    }
    const onNewDM = (data: any) => onDMSent(data)

    const onMessagesRead = (payload: { messageIds: number[]; readBy: number }) => {
      setMessages((prev) => prev.map((m) => (payload.messageIds.includes(m.id) ? { ...m, status: "read" } : m)))
    }

    const onTyping = (data: { userId: number; username: string }) => {
      if (mode === "dm" && data.userId === peerUserId) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.userId === data.userId)) return prev
          return prev.concat(data)
        })
      }
    }
    const onStopTyping = (data: { userId: number }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    }

    s.on("new-message", onNewPublic)
    s.on("dm-sent", onDMSent)
    s.on("new-direct-message", onNewDM)
    s.on("messages-read", onMessagesRead)
    s.on("user-typing", onTyping)
    s.on("user-stop-typing", onStopTyping)

    return () => {
      s.off("new-message", onNewPublic)
      s.off("dm-sent", onDMSent)
      s.off("new-direct-message", onNewDM)
      s.off("messages-read", onMessagesRead)
      s.off("user-typing", onTyping)
      s.off("user-stop-typing", onStopTyping)
    }
  }, [mode, peerUserId, me.id])

  // Auto scroll when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  const sendMessage = (text: string) => {
    const s = socketClient()
    if (mode === "broadcast") {
      s.emit("public-message", { message: text })
    } else if (mode === "dm" && peerUserId) {
      s.emit("direct-message", { toUserId: peerUserId, message: text })
    }
  }

  const sendTyping = (typing: boolean) => {
    const s = socketClient()
    if (mode === "dm" && peerUserId) {
      s.emit(typing ? "typing-start" : "typing-stop", { targetUserId: peerUserId })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm text-muted-foreground">
          {mode === "broadcast"
            ? "Broadcast channel"
            : peerUserId
              ? `Chat with #${peerUserId}`
              : "Select a conversation"}
        </div>
      </div>

      <ScrollArea className="flex-1" viewportRef={scrollRef}>
        <div className="p-4 space-y-2">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} meId={me.id} />
          ))}
          {typingUsers.length > 0 && <div className="text-xs text-muted-foreground px-2">Typing…</div>}
        </div>
      </ScrollArea>

      <Separator />
      <Composer disabled={mode === "dm" && !peerUserId} onSend={sendMessage} onTypingChange={sendTyping} />
    </div>
  )
}
