import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtAccessPayload => {
    const user = ctx
      .switchToHttp()
      .getRequest<{ user?: JwtAccessPayload }>().user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  },
);
