import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiOptionalListQueries } from 'src/common/swagger/list-query.decorator';
import { UserRole } from 'src/storage/domain.types';
import { CommentService } from './app.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentsQueryDto } from './dto/find-comments.query.dto';

@ApiBearerAuth('access-token')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOptionalListQueries()
  async findByArticle(
    @Query() query: FindCommentsQueryDto,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commentService.findByArticle(
      query.articleId,
      sortBy,
      order,
      page,
      limit,
    );
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.commentService.findOne(id);
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(user, dto);
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.commentService.remove(user, id);
  }
}
