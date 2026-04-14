import { IsUUID } from 'class-validator';

export class FindCommentsQueryDto {
  @IsUUID('4')
  articleId: string;
}
