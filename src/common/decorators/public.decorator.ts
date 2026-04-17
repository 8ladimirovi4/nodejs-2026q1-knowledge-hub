import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

//mark for public route
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
