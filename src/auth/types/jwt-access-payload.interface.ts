import type { UserRole } from 'src/storage/domain.types';

export interface JwtAccessPayload {
  userId: string;
  login: string;
  role: UserRole;
}
