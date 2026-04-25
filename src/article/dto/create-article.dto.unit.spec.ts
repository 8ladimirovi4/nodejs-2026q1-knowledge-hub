import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArticleStatus } from 'src/storage/domain.types';
import { CreateArticleDto } from './create-article.dto';

async function expectValid(plain: object) {
  const dto = plainToInstance(CreateArticleDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(CreateArticleDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

const validUuidA = '11111111-1111-4111-8111-111111111111';
const validUuidB = '22222222-2222-4222-8222-222222222222';

describe('CreateArticleDto', () => {
  it('accepts required fields only', async () => {
    await expectValid({ title: 'test article', content: 'test content' });
  });

  it('accepts valid optional fields', async () => {
    await expectValid({
      title: 'test article',
      content: 'test content',
      status: ArticleStatus.PUBLISHED,
      authorId: validUuidA,
      categoryId: validUuidB,
      tags: ['nestjs', 'testing'],
    });
  });

  it('rejects empty title', async () => {
    await expectInvalid({ title: '', content: 'body' });
  });

  it('rejects empty content', async () => {
    await expectInvalid({ title: 'title', content: '' });
  });

  it('rejects invalid status enum', async () => {
    await expectInvalid({
      title: 'title',
      content: 'body',
      status: 'WRONG_STATUS',
    });
  });

  it('rejects invalid authorId uuid', async () => {
    await expectInvalid({
      title: 'title',
      content: 'body',
      authorId: 'not-a-uuid',
    });
  });

  it('rejects invalid categoryId uuid', async () => {
    await expectInvalid({
      title: 'title',
      content: 'body',
      categoryId: 'not-a-uuid',
    });
  });

  it('rejects non-array tags', async () => {
    await expectInvalid({
      title: 'title',
      content: 'body',
      tags: 'one-tag',
    });
  });

  it('rejects non-string tags items', async () => {
    await expectInvalid({
      title: 'title',
      content: 'body',
      tags: ['ok', 1],
    });
  });
});
