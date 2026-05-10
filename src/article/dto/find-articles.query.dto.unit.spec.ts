import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArticleStatus } from 'src/storage/domain.types';
import { FindArticlesQueryDto } from './find-articles.query.dto';

async function expectValid(plain: object) {
  const dto = plainToInstance(FindArticlesQueryDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(FindArticlesQueryDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

const validUuid = '33333333-3333-4333-8333-333333333333';

describe('FindArticlesQueryDto', () => {
  it('accepts empty payload', async () => {
    await expectValid({});
  });

  it('accepts valid filters', async () => {
    await expectValid({
      status: ArticleStatus.DRAFT,
      categoryId: validUuid,
      tag: 'nestjs',
    });
  });

  it('rejects invalid status enum', async () => {
    await expectInvalid({ status: 'INVALID_STATUS' });
  });

  it('rejects invalid categoryId uuid', async () => {
    await expectInvalid({ categoryId: 'not-a-uuid' });
  });

  it('rejects non-string tag when it is provided', async () => {
    await expectInvalid({ tag: 123 });
  });

  it('transforms empty categoryId to undefined', async () => {
    const dto = plainToInstance(FindArticlesQueryDto, { categoryId: '' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.categoryId).toBeUndefined();
  });

  it('transforms empty tag to undefined', async () => {
    const dto = plainToInstance(FindArticlesQueryDto, { tag: '' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.tag).toBeUndefined();
  });
});
