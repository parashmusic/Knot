import sqlite3 from "sqlite3"
import { open } from "sqlite"
import bcrypt from "bcrypt"

// Initialize database
export async function initializeDatabase() {
  const db = await open({
    filename: "./chat-app.db",
    driver: sqlite3.Database,
  })

  // Create users table with authentication
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_online BOOLEAN DEFAULT FALSE,
      socket_id TEXT
    )
  `)

  // Create messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'public',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Create sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Direct messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      read BOOLEAN DEFAULT FALSE,
      read_at DATETIME,
      delivered BOOLEAN DEFAULT FALSE,
      delivered_at DATETIME,
      FOREIGN KEY (from_user_id) REFERENCES users (id),
      FOREIGN KEY (to_user_id) REFERENCES users (id)
    )
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS typing_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      is_typing BOOLEAN DEFAULT FALSE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (target_user_id) REFERENCES users (id),
      UNIQUE(user_id, target_user_id)
    )
  `)

  // Indexes for better performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_dm_conversation 
    ON direct_messages(from_user_id, to_user_id, timestamp)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_dm_user_messages 
    ON direct_messages(to_user_id, read, timestamp)
  `)

  console.log("📊 Database initialized successfully")
  return db
}

// Password hashing utilities
export const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash)
}

// Utility functions for direct messages
export async function getRecentConversations(db, userId) {
  return await db.all(
    `
    SELECT 
      u.id as userId,
      u.username,
      MAX(dm.timestamp) as lastMessageTime,
      COUNT(CASE WHEN dm.read = 0 AND dm.to_user_id = ? THEN 1 END) as unreadCount,
      (SELECT message FROM direct_messages 
       WHERE (from_user_id = u.id AND to_user_id = ?) 
          OR (from_user_id = ? AND to_user_id = u.id)
       ORDER BY timestamp DESC LIMIT 1) as lastMessage
    FROM users u
    JOIN direct_messages dm ON (dm.from_user_id = u.id OR dm.to_user_id = u.id)
    WHERE u.id != ? AND (dm.from_user_id = ? OR dm.to_user_id = ?)
    GROUP BY u.id
    ORDER BY lastMessageTime DESC
    LIMIT 20
  `,
    [userId, userId, userId, userId, userId, userId],
  )
}

export async function getUnreadCount(db, userId) {
  const result = await db.get("SELECT COUNT(*) as count FROM direct_messages WHERE to_user_id = ? AND read = 0", [
    userId,
  ])
  return result.count
}

export async function getOnlineUsers(db, currentUserId) {
  return await db.all(
    `
    SELECT id, username, is_online, last_login 
    FROM users 
    WHERE id != ? AND is_online = 1
    ORDER BY username
  `,
    [currentUserId],
  )
}

export async function userExists(db, userId) {
  const result = await db.get("SELECT id FROM users WHERE id = ?", [userId])
  return !!result
}
