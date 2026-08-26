import type { Server, Socket } from 'socket.io'
import { verifyAccessToken } from '../services/jwtService'
import * as chatService from '../services/chatService'
import { prisma } from '../utils/prisma'
import { accessibleChannels, canAccessChannel, isChatChannel } from '../utils/roles'

const socketsByUser = new Map<string, Set<string>>()

async function userRoles(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  })
  return user?.roles.map((role) => role.discordId) ?? []
}

function userIdOf(socket: Socket): string {
  return String(socket.data.userId || '')
}

export function registerChatSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || '')
      const decoded = verifyAccessToken(token)
      if (!decoded?.userId) {
        next(new Error('Authentication error'))
        return
      }
      socket.data.userId = decoded.userId
      next()
    } catch {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = userIdOf(socket)
    if (!userId) {
      socket.disconnect(true)
      return
    }

    const set = socketsByUser.get(userId) ?? new Set<string>()
    set.add(socket.id)
    socketsByUser.set(userId, set)

    console.log(`User ${userId} connected`)
    await chatService.setPresence(userId, true)

    const roles = await userRoles(userId)
    for (const channel of accessibleChannels(roles)) {
      void socket.join(channel)
    }

    const online = await chatService.getOnlineUsers(userId)
    io.emit('user-online', { userId })
    socket.emit('online-users', online)

    socket.on('join-channel', async (channel: string) => {
      try {
        if (!isChatChannel(channel) || !canAccessChannel(roles, channel)) return
        await socket.join(channel)
        await chatService.markRead(userId, channel)
      } catch {
        // канал недоступен
      }
    })

    socket.on('send-message', async (data: { content: string; channel: string; parentId?: string }) => {
      try {
        const message = await chatService.sendMessage(userId, data)
        io.to(data.channel).emit('new-message', message)
      } catch (error) {
        socket.emit('chat-error', { message: error instanceof Error ? error.message : 'Ошибка отправки' })
      }
    })

    socket.on('edit-message', async (data: { messageId: string; content: string; channel: string }) => {
      try {
        const message = await chatService.editMessage(data.messageId, data.content, userId)
        io.to(message.channel).emit('message-edited', message)
      } catch (error) {
        socket.emit('chat-error', { message: error instanceof Error ? error.message : 'Ошибка редактирования' })
      }
    })

    socket.on('delete-message', async (data: { messageId: string; channel: string }) => {
      try {
        const message = await chatService.deleteMessage(data.messageId, userId)
        io.to(message.channel).emit('message-deleted', { messageId: data.messageId, channel: message.channel })
      } catch (error) {
        socket.emit('chat-error', { message: error instanceof Error ? error.message : 'Ошибка удаления' })
      }
    })

    socket.on('add-reaction', async (data: { messageId: string; emoji: string; channel: string }) => {
      try {
        const result = await chatService.addReaction(data.messageId, userId, data.emoji)
        io.to(result.channel).emit('reaction-added', result)
      } catch (error) {
        socket.emit('chat-error', { message: error instanceof Error ? error.message : 'Ошибка реакции' })
      }
    })

    socket.on('remove-reaction', async (data: { messageId: string; emoji: string; channel: string }) => {
      try {
        const result = await chatService.removeReaction(data.messageId, userId, data.emoji)
        io.to(result.channel).emit('reaction-removed', result)
      } catch (error) {
        socket.emit('chat-error', { message: error instanceof Error ? error.message : 'Ошибка реакции' })
      }
    })

    socket.on('pin-message', async (data: { messageId: string; pinned: boolean }) => {
      try {
        const message = await chatService.pinMessage(data.messageId, userId, data.pinned)
        io.to(message.channel).emit('message-pinned', message)
      } catch (error) {
        socket.emit('chat-error', { message: error instanceof Error ? error.message : 'Ошибка закрепления' })
      }
    })

    socket.on('typing', async (data: { channel: string }) => {
      await chatService.setTyping(userId, true)
      socket.to(data.channel).emit('user-typing', { userId, channel: data.channel })
    })

    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`)
      const remaining = socketsByUser.get(userId)
      remaining?.delete(socket.id)
      if (!remaining || remaining.size === 0) {
        socketsByUser.delete(userId)
        await chatService.setPresence(userId, false)
        io.emit('user-offline', userId)
      }
    })
  })
}
