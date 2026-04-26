import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from 'src/common/errors';
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtAccessPayload => {
    const user = ctx
      .switchToHttp()
      .getRequest<{ user?: JwtAccessPayload }>().user;
    if (!user) {
      throw new UnauthorizedError(
        'Authenticated user is not present on the request',
      );
    }
    return user;
  },
);
