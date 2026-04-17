import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

export {};
