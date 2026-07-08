import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import { KnowledgeDocument } from './entities/document.model'
import { KnowledgeChunk } from './entities/document-chunk.model'
import { EmbeddingService } from './embedding.service'

const CHUNK_SIZE = 1800   // chars per chunk
const CHUNK_OVERLAP = 300 // overlap between chunks
const TOP_K = 5

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end === text.length) break
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.filter(c => c.length > 40)
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name)

  constructor(
    @InjectModel(KnowledgeDocument) private docModel: typeof KnowledgeDocument,
    @InjectModel(KnowledgeChunk) private chunkModel: typeof KnowledgeChunk,
    private embedding: EmbeddingService,
    private sequelize: Sequelize
  ) {}

  async ensureExtension() {
    try {
      await this.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;')
      // Add embedding column if not present (idempotent)
      await this.sequelize.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='knowledge_chunks' AND column_name='embedding'
          ) THEN
            ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(${this.embedding.dims});
          END IF;
        END $$;
      `)
    } catch (e) {
      this.logger.warn('pgvector setup skipped (will use keyword search):', (e as Error).message)
    }
  }

  async ingest(userId: string, name: string, mimeType: string, buffer: Buffer): Promise<KnowledgeDocument> {
    const text = await this.extractText(buffer, mimeType, name)

    const doc = await this.docModel.create({
      userId, name, mimeType, size: buffer.length, status: 'processing', chunkCount: 0
    } as any)

    // Run chunking + embedding async so the upload returns immediately
    this.processChunks(doc, userId, text).catch(e =>
      this.logger.error(`Chunk processing failed for doc ${doc.id}:`, e.message)
    )

    return doc
  }

  private async processChunks(doc: KnowledgeDocument, userId: string, text: string) {
    const chunks = chunkText(text)
    const embeddings = await this.embedding.embedBatch(chunks)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = await this.chunkModel.create({
        documentId: doc.id, userId, content: chunks[i], chunkIndex: i
      } as any)

      if (embeddings[i]) {
        try {
          await this.sequelize.query(
            `UPDATE knowledge_chunks SET embedding = :vec WHERE id = :id`,
            { replacements: { vec: `[${embeddings[i]!.join(',')}]`, id: chunk.id } }
          )
        } catch { /* pgvector not available — keyword search will be used */ }
      }
    }

    await doc.update({ status: 'ready', chunkCount: chunks.length })
  }

  async retrieve(userId: string, query: string, topK = TOP_K): Promise<string> {
    const queryEmbedding = await this.embedding.embed(query)

    let rows: Array<{ content: string }> = []

    if (queryEmbedding) {
      try {
        rows = await this.sequelize.query<{ content: string }>(
          `SELECT content FROM knowledge_chunks
           WHERE "userId" = :userId AND embedding IS NOT NULL
           ORDER BY embedding <=> :vec
           LIMIT :k`,
          { replacements: { userId, vec: `[${queryEmbedding.join(',')}]`, k: topK }, type: QueryTypes.SELECT }
        )
      } catch {
        rows = await this.keywordSearch(userId, query, topK)
      }
    } else {
      rows = await this.keywordSearch(userId, query, topK)
    }

    if (rows.length === 0) return ''

    return rows.map((r, i) => `[Excerpt ${i + 1}]\n${r.content}`).join('\n\n')
  }

  private async keywordSearch(userId: string, query: string, topK: number): Promise<Array<{ content: string }>> {
    const words = query.split(/\s+/).filter(w => w.length > 2).slice(0, 8)
    if (words.length === 0) return []
    return this.sequelize.query<{ content: string }>(
      `SELECT content FROM knowledge_chunks
       WHERE "userId" = :userId
       AND content ILIKE ANY(ARRAY[${words.map((_, i) => `:w${i}`).join(',')}])
       LIMIT :k`,
      { replacements: { userId, k: topK, ...Object.fromEntries(words.map((w, i) => [`w${i}`, `%${w}%`])) }, type: QueryTypes.SELECT }
    )
  }

  async listDocuments(userId: string) {
    return this.docModel.findAll({ where: { userId }, order: [['createdAt', 'DESC']] })
  }

  async deleteDocument(userId: string, docId: string) {
    const doc = await this.docModel.findOne({ where: { id: docId, userId } })
    if (!doc) throw new NotFoundException('Document not found')
    await this.chunkModel.destroy({ where: { documentId: docId } })
    await doc.destroy()
  }

  private async extractText(buffer: Buffer, mimeType: string, name: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
        const result = await pdfParse(buffer)
        return result.text
      } catch (e) {
        this.logger.warn('PDF parse failed:', (e as Error).message)
        return buffer.toString('utf-8', 0, 50000)
      }
    }
    return buffer.toString('utf-8', 0, 200000)
  }
}
