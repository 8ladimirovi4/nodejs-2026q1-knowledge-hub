import { RefreshTokenBlacklistService } from './refresh-token-blacklist.service';

describe('RefreshTokenBlacklistService', () => {
  let service: RefreshTokenBlacklistService;

  beforeEach(() => {
    service = new RefreshTokenBlacklistService();
  });

  it('returns false for token that was not revoked', () => {
    expect(service.isRevoked('token-a')).toBe(false);
  });

  it('returns true for token after revoke', () => {
    const token = 'token-b';
    service.revoke(token);

    expect(service.isRevoked(token)).toBe(true);
  });

  it('does not revoke different token implicitly', () => {
    service.revoke('token-c');

    expect(service.isRevoked('token-d')).toBe(false);
  });

  it('keeps token revoked after repeated checks', () => {
    const token = 'token-e';
    service.revoke(token);

    expect(service.isRevoked(token)).toBe(true);
    expect(service.isRevoked(token)).toBe(true);
  });
});
