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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiOptionalListQueries } from 'src/common/swagger/list-query.decorator';
import { ArticleService } from './app.service';
import { FindArticlesQueryDto } from './dto/find-articles.query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/storage';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';

@ApiBearerAuth('access-token')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiOptionalListQueries()
  findAll(
    @Query() query: FindArticlesQueryDto,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.articleService.findAll(query, sortBy, order, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.articleService.findOne(id);
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtAccessPayload, @Body() dto: CreateArticleDto) {
    return this.articleService.create(user, dto);
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Put(':id')
  updateArticle(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articleService.update(user, id, dto);
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.articleService.remove(user, id);
  }
}
