import { Injectable } from '@nestjs/common';
import { RagSearchDto } from './dto/rag-search.dto';

@Injectable()
export class RagRetrievalService {
  async searchRetrieval(_dto: RagSearchDto) {
    return 'rag search response';
  }
}
