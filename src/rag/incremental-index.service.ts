import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type RagIndexFingerprints = {
  fingerprint: string;
  skip: boolean;
};

@Injectable()
export class IncrementalIndexService {
  constructor(private readonly prisma: PrismaService) {}

  fingerprintForSyncPayload(canonicalPayload: string): string {
    return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
  }

  fingerprintAnalysis(
    storedHash: string | null | undefined,
    canonicalPayload: string,
  ): RagIndexFingerprints {
    const fingerprint = this.fingerprintForSyncPayload(canonicalPayload);
    const skip =
      storedHash !== null &&
      storedHash !== undefined &&
      storedHash === fingerprint;
    return { fingerprint, skip };
  }

  async markArticleIndexed(
    articleId: string,
    fingerprint: string,
  ): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        ragIndexedContentHash: fingerprint,
        ragIndexedAt: new Date(),
      },
    });
  }

  async clearArticleIndexState(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        ragIndexedContentHash: null,
        ragIndexedAt: null,
      },
    });
  }
}
