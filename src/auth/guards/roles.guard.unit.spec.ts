import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/storage/domain.types';
import { RolesGuard } from './roles.guard';

function createExecutionContextMock(user?: {
  userId: string;
  login: string;
  role: UserRole;
}) {
  const request = { user } as { user?: typeof user };
  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: vi.fn(() => request),
    })),
  } as unknown as ExecutionContext;

  return { context };
}

describe('RolesGuard', () => {
  const reflectorMock = {
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;

  let guard: RolesGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RolesGuard(reflectorMock);
  });

  it('returns true when no roles metadata is defined', () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue(undefined);
    const { context } = createExecutionContextMock();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true when roles metadata is an empty array', () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue([]);
    const { context } = createExecutionContextMock();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when required roles exist but request has no user', () => {
    reflectorMock.getAllAndOverride = vi.fn().mockReturnValue([UserRole.ADMIN]);
    const { context } = createExecutionContextMock();

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user role is not in required roles', () => {
    reflectorMock.getAllAndOverride = vi
      .fn()
      .mockReturnValue([UserRole.ADMIN, UserRole.EDITOR]);
    const { context } = createExecutionContextMock({
      userId: 'u-1',
      login: 'viewer',
      role: UserRole.VIEWER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('returns true when user role is in required roles', () => {
    reflectorMock.getAllAndOverride = vi
      .fn()
      .mockReturnValue([UserRole.ADMIN, UserRole.EDITOR]);
    const { context } = createExecutionContextMock({
      userId: 'u-1',
      login: 'editor',
      role: UserRole.EDITOR,
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
