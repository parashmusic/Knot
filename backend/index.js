import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import {
  initializeDatabase,
  hashPassword,
  comparePassword,
  getRecentConversations,
  getOnlineUsers,
} from "./database.js"
import { generateToken, authMiddleware } from "./auth.js"

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "*",
    methods: ["GET", "POST"],
  },
})

app.use(cors())
app.use(express.json())

// Initialize database
let db
initializeDatabase().then((database) => {
  db = database
  console.log("✅ DB Connected")
})

// Authentication routes
app.post("/api/auth/register", async (req, res) => {
  const { username, phoneNumber, password } = req.body

  // Validation
  if (!username || !phoneNumber || !password) {
    return res.status(400).json({ error: "All fields are required" })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  try {
    // Check if username already exists
    const existingUser = await db.get("SELECT id FROM users WHERE username = ? OR phone_number = ?", [
      username,
      phoneNumber,
    ])

    if (existingUser) {
      return res.status(400).json({ error: "Username or phone number already exists" })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    const result = await db.run("INSERT INTO users (username, phone_number, password_hash) VALUES (?, ?, ?)", [
      username,
      phoneNumber,
      passwordHash,
    ])

    const token = generateToken(result.lastID, username)

    res.json({
      message: "User registered successfully",
      token,
      user: { id: result.lastID, username, phoneNumber },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }

  try {
    // Find user by username or phone number
    const user = await db.get("SELECT * FROM users WHERE username = ? OR phone_number = ?", [username, username])

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Update last login
    await db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id])

    const token = generateToken(user.id, user.username)

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, phoneNumber: user.phone_number },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Apply authentication middleware to Socket.io
io.use(authMiddleware)

// In-memory stores for active connections
const connectedUsers = new Map()
const networkMetrics = new Map()

// Helper function to get user socket by user ID
const getUserSocket = (userId) => {
  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.userId === userId) {
      return user.socket
    }
  }
  return null
}

// Network monitoring class
class NetworkMonitor {
  static calculateLatency(socketId) {
    const metrics = networkMetrics.get(socketId)
    if (metrics && metrics.pings.length > 0) {
      const latencies = metrics.pings.slice(-10)
      const sum = latencies.reduce((a, b) => a + b, 0)
      return sum / latencies.length
    }
    return 0
  }

  static calculateJitter(socketId) {
    const metrics = networkMetrics.get(socketId)
    if (metrics && metrics.pings.length >= 2) {
      const latencies = metrics.pings.slice(-10)
      const differences = []
      for (let i = 1; i < latencies.length; i++) {
        differences.push(Math.abs(latencies[i] - latencies[i - 1]))
      }
      return differences.length > 0 ? differences.reduce((a, b) => a + b, 0) / differences.length : 0
    }
    return 0
  }

  static getNetworkHealth(latency, jitter, packetLoss = 0) {
    if (latency <= 0) return "measuring"
    if (latency < 50 && jitter < 10 && packetLoss < 1) return "excellent"
    if (latency < 100 && jitter < 20 && packetLoss < 3) return "good"
    if (latency < 200 && jitter < 30 && packetLoss < 5) return "fair"
    return "poor"
  }
}

// Helper to get user list
const getUserList = () => {
  return Array.from(connectedUsers.values()).map((u) => {
    const latency = NetworkMonitor.calculateLatency(u.socket.id)
    const jitter = NetworkMonitor.calculateJitter(u.socket.id)

    return {
      username: u.username,
      userId: u.userId,
      latency: latency,
      jitter: jitter,
      connectionQuality: NetworkMonitor.getNetworkHealth(latency, jitter),
    }
  })
}

io.on("connection", (socket) => {
  console.log(`🔌 User ${socket.username} connected:`, socket.id)

  // Initialize network metrics
  networkMetrics.set(socket.id, {
    pings: [],
    packetCount: { sent: 0, received: 0 },
    connectionStart: Date.now(),
  })

  // Update user status in database
  db.run("UPDATE users SET is_online = TRUE, socket_id = ? WHERE id = ?", [socket.id, socket.userId]).catch((err) =>
    console.log("Database update error:", err),
  )

  // Store in memory for active connections
  connectedUsers.set(socket.id, {
    userId: socket.userId,
    username: socket.username,
    socket: socket,
  })

  // Notify others
  socket.broadcast.emit("user-joined", socket.username)

  // Send current user list
  const userList = getUserList()
  io.emit("user-list-update", userList)

  // Handle ping for latency measurement
  socket.on("ping", (clientTime) => {
    const serverTime = Date.now()
    const latency = serverTime - clientTime

    const metrics = networkMetrics.get(socket.id)
    if (metrics) {
      metrics.pings.push(latency)
      if (metrics.pings.length > 20) {
        metrics.pings.shift()
      }

      const currentLatency = NetworkMonitor.calculateLatency(socket.id)
      const currentJitter = NetworkMonitor.calculateJitter(socket.id)

      socket.emit("pong", {
        clientTime,
        serverTime,
        latency: latency,
        averageLatency: currentLatency,
        jitter: currentJitter,
        connectionQuality: NetworkMonitor.getNetworkHealth(currentLatency, currentJitter),
      })
    }
  })

  // Public messages
  socket.on("public-message", async (data) => {
    const user = connectedUsers.get(socket.id)
    if (!user) return

    // Update packet count
    const metrics = networkMetrics.get(socket.id)
    metrics.packetCount.sent++

    const messageData = {
      id: Date.now(),
      username: user.username,
      message: data.message,
      timestamp: new Date().toLocaleTimeString(),
      type: "public",
    }

    // Store message in database
    try {
      await db.run("INSERT INTO messages (user_id, username, message, message_type) VALUES (?, ?, ?, ?)", [
        user.userId,
        user.username,
        data.message,
        "public",
      ])
    } catch (error) {
      console.log("Database error on message:", error)
    }

    io.emit("new-message", messageData)
  })

  // Get network stats
  socket.on("get-network-stats", () => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      const metrics = networkMetrics.get(socket.id)
      const latency = NetworkMonitor.calculateLatency(socket.id)
      const jitter = NetworkMonitor.calculateJitter(socket.id)

      const stats = {
        latency: latency,
        jitter: jitter,
        packetLoss: 0,
        connectionQuality: NetworkMonitor.getNetworkHealth(latency, jitter),
        packetsSent: metrics.packetCount.sent,
        packetsReceived: metrics.packetCount.received,
        totalMeasurements: metrics.pings.length,
        timestamp: new Date().toLocaleTimeString(),
      }

      socket.emit("network-stats", stats)
    }
  })

  // Direct Message Events
  socket.on("direct-message", async (data) => {
    const { toUserId, message } = data

    try {
      // Validate recipient exists
      const recipient = await db.get("SELECT id, username FROM users WHERE id = ?", [toUserId])

      if (!recipient) {
        return socket.emit("dm-error", "Recipient not found")
      }

      // Insert message into database
      const result = await db.run(
        `INSERT INTO direct_messages (from_user_id, to_user_id, message, timestamp, delivered) 
         VALUES (?, ?, ?, ?, ?)`,
        [socket.userId, toUserId, message, new Date().toISOString(), false],
      )

      const messageId = result.lastID

      // Prepare message data for emission
      const messageData = {
        id: messageId,
        from: socket.userId,
        fromUsername: socket.username,
        to: toUserId,
        toUsername: recipient.username,
        message: message,
        timestamp: new Date().toISOString(),
        status: "sent",
      }

      // Emit to recipient if online
      const recipientSocket = getUserSocket(toUserId)
      if (recipientSocket) {
        // Mark as delivered
        await db.run("UPDATE direct_messages SET delivered = 1, delivered_at = ? WHERE id = ?", [
          new Date().toISOString(),
          messageId,
        ])

        messageData.status = "delivered"
        recipientSocket.emit("new-direct-message", messageData)
      }

      // Emit back to sender with status
      socket.emit("dm-sent", {
        ...messageData,
        status: recipientSocket ? "delivered" : "sent",
      })
    } catch (error) {
      console.error("Direct message error:", error)
      socket.emit("dm-error", "Failed to send message")
    }
  })

  // Get conversation history
  socket.on("get-conversation", async (data) => {
    const { withUserId } = data

    try {
      const messages = await db.all(
        `
      SELECT 
        dm.id,
        dm.from_user_id as "fromUserId",
        u1.username as fromUsername,
        dm.to_user_id as "toUserId",
        u2.username as toUsername,
        dm.message,
        dm.timestamp,
        dm.read,
        dm.delivered,
        dm.message_type
      FROM direct_messages dm
      JOIN users u1 ON dm.from_user_id = u1.id
      JOIN users u2 ON dm.to_user_id = u2.id
      WHERE (dm.from_user_id = ? AND dm.to_user_id = ?) 
         OR (dm.from_user_id = ? AND dm.to_user_id = ?)
      ORDER BY dm.timestamp ASC
      LIMIT 100
    `,
        [socket.userId, withUserId, withUserId, socket.userId],
      )

      socket.emit("conversation-history", messages)
    } catch (error) {
      console.error("Get conversation error:", error)
    }
  })

  // Mark messages as read
  socket.on("mark-messages-read", async (data) => {
    const { messageIds } = data

    try {
      const placeholders = messageIds.map(() => "?").join(",")
      await db.run(
        `UPDATE direct_messages 
         SET read = 1, read_at = ? 
         WHERE id IN (${placeholders}) AND to_user_id = ?`,
        [new Date().toISOString(), ...messageIds, socket.userId],
      )

      // Notify sender that messages were read
      const readMessages = await db.all(`SELECT from_user_id FROM direct_messages WHERE id IN (${placeholders})`, [
        ...messageIds,
      ])

      const uniqueSenders = [...new Set(readMessages.map((msg) => msg.from_user_id))]

      uniqueSenders.forEach((senderId) => {
        const senderSocket = getUserSocket(senderId)
        if (senderSocket) {
          senderSocket.emit("messages-read", {
            messageIds,
            readBy: socket.userId,
            readAt: new Date().toISOString(),
          })
        }
      })
    } catch (error) {
      console.error("Mark messages read error:", error)
    }
  })

  // Typing indicators
  socket.on("typing-start", async (data) => {
    const { targetUserId } = data

    try {
      await db.run(
        `
        INSERT OR REPLACE INTO typing_indicators 
        (user_id, target_user_id, is_typing, updated_at) 
        VALUES (?, ?, ?, ?)
      `,
        [socket.userId, targetUserId, true, new Date().toISOString()],
      )

      const targetSocket = getUserSocket(targetUserId)
      if (targetSocket) {
        targetSocket.emit("user-typing", {
          userId: socket.userId,
          username: socket.username,
        })
      }
    } catch (error) {
      console.error("Typing start error:", error)
    }
  })

  socket.on("typing-stop", async (data) => {
    const { targetUserId } = data

    try {
      await db.run(
        `
        UPDATE typing_indicators 
        SET is_typing = 0, updated_at = ? 
        WHERE user_id = ? AND target_user_id = ?
      `,
        [new Date().toISOString(), socket.userId, targetUserId],
      )

      const targetSocket = getUserSocket(targetUserId)
      if (targetSocket) {
        targetSocket.emit("user-stop-typing", {
          userId: socket.userId,
        })
      }
    } catch (error) {
      console.error("Typing stop error:", error)
    }
  })

  // Get recent conversations
  socket.on("get-recent-conversations", async () => {
    try {
      const conversations = await getRecentConversations(db, socket.userId)
      socket.emit("recent-conversations", conversations)
    } catch (error) {
      console.error("Error getting recent conversations:", error)
    }
  })

  // Get online users for DM
  socket.on("get-online-users", async () => {
    try {
      const onlineUsers = await getOnlineUsers(db, socket.userId)
      socket.emit("online-users-list", onlineUsers)
    } catch (error) {
      console.error("Error getting online users:", error)
    }
  })

  socket.on("disconnect", async () => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      console.log(`👋 ${user.username} disconnected`)

      // Update database
      try {
        await db.run("UPDATE users SET is_online = FALSE, socket_id = NULL WHERE id = ?", [user.userId])
      } catch (error) {
        console.log("Database error on disconnect:", error)
      }

      // Remove from memory
      connectedUsers.delete(socket.id)
      networkMetrics.delete(socket.id)

      // Notify others
      socket.broadcast.emit("user-left", user.username)
      const userList = getUserList()
      io.emit("user-list-update", userList)
    }
  })
})

// API endpoints
app.get("/api/users/online", async (req, res) => {
  try {
    const users = await db.all("SELECT username, phone_number, last_login FROM users WHERE is_online = TRUE")
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: "Database error" })
  }
})

app.get("/api/messages/history", async (req, res) => {
  try {
    const messages = await db.all(`
      SELECT m.username, m.message, m.message_type, m.timestamp 
      FROM messages m 
      ORDER BY m.timestamp DESC 
      LIMIT 100
    `)
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: "Database error" })
  }
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
