import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RefreshTokenDto } from './refreshTokenDto';

async function expectValid(plain: object) {
  const dto = plainToInstance(RefreshTokenDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(RefreshTokenDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

describe('RefreshTokenDto', () => {
  it('accepts empty payload because refreshToken is optional', async () => {
    await expectValid({});
  });

  it('accepts valid refreshToken', async () => {
    await expectValid({ refreshToken: 'jwt-refresh-token' });
  });

  it('rejects empty refreshToken when it is provided', async () => {
    await expectInvalid({ refreshToken: '' });
  });

  it('rejects non-string refreshToken', async () => {
    await expectInvalid({ refreshToken: 123 });
  });
});
