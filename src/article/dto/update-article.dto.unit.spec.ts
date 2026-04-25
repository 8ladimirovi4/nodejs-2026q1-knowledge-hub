import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArticleStatus } from 'src/storage/domain.types';
import { UpdateArticleDto } from './update-article.dto';

async function expectValid(plain: object) {
  const dto = plainToInstance(UpdateArticleDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(UpdateArticleDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

const validUuid = '33333333-3333-4333-8333-333333333333';

describe('UpdateArticleDto', () => {
  it('accepts empty payload because all fields are optional', async () => {
    await expectValid({});
  });

  it('accepts valid partial payload', async () => {
    await expectValid({
      title: 'updated title',
      status: ArticleStatus.PUBLISHED,
      categoryId: validUuid,
      tags: ['api', 'nestjs'],
    });
  });

  it('rejects invalid status enum', async () => {
    await expectInvalid({ status: 'WRONG_STATUS' });
  });

  it('rejects invalid categoryId uuid', async () => {
    await expectInvalid({ categoryId: 'not-a-uuid' });
  });

  it('rejects non-array tags', async () => {
    await expectInvalid({ tags: 'single-tag' });
  });
});
