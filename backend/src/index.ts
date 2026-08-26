import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import authRoutes from './routes/auth'
import profileRoutes from './routes/profile'
import shopRoutes from './routes/shop'
import { ensureUploadDirs, UPLOADS_DIR } from './utils/media'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

ensureUploadDirs()

const app = express()
const PORT = process.env.PORT || 5000
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
app.use('/api', profileRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
