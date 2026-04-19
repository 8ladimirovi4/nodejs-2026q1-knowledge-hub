import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class RefreshTokenBlacklistService {
  private readonly hashes = new Set<string>();

  revoke(token: string): void {
    this.hashes.add(this.hash(token));
  }

  isRevoked(token: string): boolean {
    return this.hashes.has(this.hash(token));
  }

  private hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
