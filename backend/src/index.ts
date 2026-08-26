import http from 'http'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { Server } from 'socket.io'
import authRoutes from './routes/auth'
import profileRoutes from './routes/profile'
import shopRoutes from './routes/shop'
import promoRoutes from './routes/promo'
import activationRoutes from './routes/activation'
import bonusRoutes from './routes/bonus'
import chatRoutes from './routes/chat'
import adminRoutes from './routes/admin'
import { ensureUploadDirs, UPLOADS_DIR } from './utils/media'
import { registerChatSocket } from './sockets/chatSocket'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

ensureUploadDirs()

const app = express()
const PORT = Number(process.env.PORT) || 5000
app.set('trust proxy', 1)

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

app.use('/api/auth', authRoutes)
app.use('/api/shop', shopRoutes)
app.use('/api', promoRoutes)
app.use('/api', activationRoutes)
app.use('/api', bonusRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api', profileRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})

registerChatSocket(io)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
