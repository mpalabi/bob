import {
  Controller, Delete, Get, Param, Post, UploadedFile,
  UseGuards, UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'
import { KnowledgeService } from './knowledge.service'

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private knowledge: KnowledgeService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.knowledge.listDocuments(user.id)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.knowledge.ingest(user.id, file.originalname, file.mimetype, file.buffer)
  }

  @Delete(':id')
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.knowledge.deleteDocument(user.id, id)
  }
}
