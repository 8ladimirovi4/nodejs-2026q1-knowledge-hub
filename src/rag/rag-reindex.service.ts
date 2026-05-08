import { Injectable } from '@nestjs/common';
import { RagReIndexDto } from './dto/rag-reindex.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundError } from 'src/common/errors';

@Injectable()
export class RagIndexingService {
  constructor(private readonly prisma: PrismaService) {}

  createVectorIndex(_dto: RagReIndexDto) {
    return 'vector reindex response';
  }

  removeArticleFromIndex(_id: string) {
    const article = false;
    if (!article) {
      throw new NotFoundError('article not found');
    }
    return 'remove article from index';
  }
}
