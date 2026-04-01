import { Module } from '@nestjs/common';
import { InMemoryStorage } from './in-memory.storage';
import { StorageFacade } from './storage.facade';

@Module({
  providers: [
    {
      provide: StorageFacade,
      useClass: InMemoryStorage,
    },
  ],
  exports: [StorageFacade],
})
export class StorageModule {}
