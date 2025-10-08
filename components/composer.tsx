"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  disabled?: boolean
  onSend: (text: string) => void
  onTypingChange?: (typing: boolean) => void
}

export function Composer({ disabled, onSend, onTypingChange }: Props) {
  const [text, setText] = useState("")
  const typingRef = useRef(false)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const emitTyping = (isTyping: boolean) => {
    if (typingRef.current === isTyping) return
    typingRef.current = isTyping
    onTypingChange?.(isTyping)
  }

  return (
    <div className={cn("flex items-center gap-2 p-3", disabled && "opacity-50 pointer-events-none")}>
      <Input
        value={text}
        placeholder="Write a message…"
        onChange={(e) => {
          setText(e.target.value)
          emitTyping(true)
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => emitTyping(false), 1200)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            const payload = text.trim()
            if (payload.length) {
              onSend(payload)
              setText("")
              emitTyping(false)
            }
          }
        }}
      />
      <Button
        onClick={() => {
          const payload = text.trim()
          if (payload.length) {
            onSend(payload)
            setText("")
            emitTyping(false)
          }
        }}
      >
        Send
      </Button>
    </div>
  )
}
