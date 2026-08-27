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
import contentRoutes from './routes/content'
import newsRoutes from './routes/news'
import { registerChatSocket } from './sockets/chatSocket'
import { ensureUploadDirs, UPLOADS_DIR } from './utils/media'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

ensureUploadDirs()

const app = express()
const PORT = Number(process.env.PORT) || 5000
app.set('trust proxy', 1)

const corsOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://2.26.85.78',
  'https://aspectvisuals.su',
  'http://aspectvisuals.su',
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(',').map((item) => item.trim()))

app.use(
  cors({
    origin: (origin, callback) => {
      // Electron-лаунчер грузит index.html с file://, поэтому Origin отсутствует или равен null
      const isLauncher = !origin || origin === 'null' || origin.startsWith('file://')
      if (isLauncher || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origin ${origin} не разрешён политикой CORS`))
    },
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
app.use('/api/content', contentRoutes)
app.use('/api', newsRoutes)
app.use('/api', profileRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Отклонённый CORS не должен превращаться в HTML-страницу 500 от Express
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.message?.includes('политикой CORS')) {
    res.status(403).json({ message: 'Запрос с этого домена запрещён' })
    return
  }
  next(err)
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const isLauncher = !origin || origin === 'null' || origin.startsWith('file://')
      if (isLauncher || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origin ${origin} не разрешён политикой CORS`))
    },
    credentials: true,
  },
})

registerChatSocket(io)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
