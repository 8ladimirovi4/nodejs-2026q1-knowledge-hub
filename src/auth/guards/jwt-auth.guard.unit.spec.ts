import { Reflector } from '@nestjs/core';
import { UnauthorizedError } from 'src/common/errors';
import type { ExecutionContext } from '@nestjs/common';
import { UserRole } from 'src/storage/domain.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../auth.service';

function createExecutionContextMock(overrides?: {
  path?: string;
  authorization?: string;
}) {
  const request = {
    path: overrides?.path ?? '/user',
    headers: {
      authorization: overrides?.authorization,
    },
  } as {
    path: string;
    headers: { authorization?: string };
    user?: unknown;
  };

  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: vi.fn(() => request),
    })),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  const authServiceMock = {
    validateAccessToken: vi.fn(),
  };
  const reflectorMock = {
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;

  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new JwtAuthGuard(
      authServiceMock as unknown as AuthService,
      reflectorMock,
    );
  });

  it('returns true when route is marked as public via reflector metadata', async () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(true);
    const { context } = createExecutionContextMock();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authServiceMock.validateAccessToken).not.toHaveBeenCalled();
  });

  it('returns true for /doc path without token', async () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(false);
    const { context } = createExecutionContextMock({ path: '/doc' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authServiceMock.validateAccessToken).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError when token is missing', async () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(false);
    const { context } = createExecutionContextMock({ path: '/user' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('throws UnauthorizedError when authorization type is not Bearer', async () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(false);
    const { context } = createExecutionContextMock({
      path: '/user',
      authorization: 'Basic abc123',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('propagates UnauthorizedError when authService rejects invalid token', async () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(false);
    authServiceMock.validateAccessToken.mockImplementationOnce(() => {
      throw new UnauthorizedError('Invalid or expired access token');
    });
    const { context } = createExecutionContextMock({
      path: '/user',
      authorization: 'Bearer invalid-token',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('sets request.user and returns true for valid bearer token', async () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(false);
    const payload = {
      userId: '11111111-1111-1111-1111-111111111111',
      login: 'john',
      role: UserRole.EDITOR,
    };
    authServiceMock.validateAccessToken.mockReturnValueOnce(payload);
    const { context, request } = createExecutionContextMock({
      path: '/user',
      authorization: 'Bearer valid-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authServiceMock.validateAccessToken).toHaveBeenCalledWith(
      'valid-token',
    );
    expect(request.user).toEqual(payload);
  });
});
