import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "cisco-chat-app-secret-key"

export const generateToken = (userId, username) => {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "7d" })
}

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export const authMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error("Authentication error: No token provided"))
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return next(new Error("Authentication error: Invalid token"))
  }

  socket.userId = decoded.userId
  socket.username = decoded.username
  next()
}
