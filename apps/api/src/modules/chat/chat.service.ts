import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Message } from './entities/message.model'
import { Channel } from './entities/channel.model'

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(Channel) private channelModel: typeof Channel
  ) {}

  async getMessages(channelId: string, limit = 50) {
    return this.messageModel.findAll({
      where: { channelId },
      order: [['createdAt', 'DESC']],
      limit
    })
  }

  async createMessage(channelId: string, userId: string, content: string) {
    return this.messageModel.create({ channelId, userId, content } as any)
  }

  async getChannels() {
    return this.channelModel.findAll({ where: { isPrivate: false } })
  }

  async createChannel(name: string, isPrivate = false) {
    return this.channelModel.create({ name, isPrivate } as any)
  }
}
