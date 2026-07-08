import { Module, OnModuleInit } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { MulterModule } from '@nestjs/platform-express'
import { KnowledgeDocument } from './entities/document.model'
import { KnowledgeChunk } from './entities/document-chunk.model'
import { EmbeddingService } from './embedding.service'
import { KnowledgeService } from './knowledge.service'
import { KnowledgeController } from './knowledge.controller'

@Module({
  imports: [
    SequelizeModule.forFeature([KnowledgeDocument, KnowledgeChunk]),
    MulterModule.register({ storage: undefined }) // memory storage (buffer)
  ],
  providers: [EmbeddingService, KnowledgeService],
  controllers: [KnowledgeController],
  exports: [KnowledgeService]
})
export class KnowledgeModule implements OnModuleInit {
  constructor(private knowledge: KnowledgeService) {}

  async onModuleInit() {
    await this.knowledge.ensureExtension()
  }
}
