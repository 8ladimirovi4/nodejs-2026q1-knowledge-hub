import { Injectable } from '@nestjs/common';

// Incremental indexing pipeline (index only changed articles, with idempotent behavior) layer
@Injectable()
export class IncrementalIndexService {}
