import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import type { DmConversation } from '@bob/shared'
import { DirectMessage } from './entities/direct-message.model'
import { UsersService } from '../users/users.service'

@Injectable()
export class DmService {
  constructor(
    @InjectModel(DirectMessage) private dmModel: typeof DirectMessage,
    private usersService: UsersService
  ) {}

  /** Full message history between two users, oldest first. */
  async getConversation(userId: string, otherId: string, limit = 100): Promise<DirectMessage[]> {
    const rows = await this.dmModel.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, recipientId: otherId },
          { senderId: otherId, recipientId: userId }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit
    })
    return rows.reverse()
  }

  async send(senderId: string, recipientId: string, content: string): Promise<DirectMessage> {
    return this.dmModel.create({ senderId, recipientId, content } as any)
  }

  async markRead(userId: string, otherId: string): Promise<void> {
    await this.dmModel.update(
      { readAt: new Date() },
      { where: { senderId: otherId, recipientId: userId, readAt: null } }
    )
  }

  /** One entry per other user the current user has exchanged messages with. */
  async listConversations(userId: string): Promise<DmConversation[]> {
    const messages = await this.dmModel.findAll({
      where: { [Op.or]: [{ senderId: userId }, { recipientId: userId }] },
      order: [['createdAt', 'DESC']]
    })

    const byOther = new Map<string, { last: DirectMessage; unread: number }>()
    for (const m of messages) {
      const otherId = m.senderId === userId ? m.recipientId : m.senderId
      const entry = byOther.get(otherId)
      const isUnread = m.recipientId === userId && !m.readAt
      if (!entry) {
        byOther.set(otherId, { last: m, unread: isUnread ? 1 : 0 })
      } else if (isUnread) {
        entry.unread += 1
      }
    }

    const conversations: DmConversation[] = []
    for (const [otherId, { last, unread }] of byOther) {
      const user = await this.usersService.findByIdOrNull(otherId)
      if (!user) continue
      conversations.push({
        user: user.toJSON() as unknown as DmConversation['user'],
        lastMessage: last.toJSON() as unknown as DmConversation['lastMessage'],
        unreadCount: unread
      })
    }
    return conversations
  }
}
