import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthDto } from './auth.dto';

async function expectValid(plain: object) {
  const dto = plainToInstance(AuthDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(AuthDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

describe('AuthDto', () => {
  it('accepts valid login and password', async () => {
    await expectValid({
      login: 'user-login',
      password: 'strong-password',
    });
  });

  it('rejects when login is missing', async () => {
    await expectInvalid({
      password: 'strong-password',
    });
  });

  it('rejects when password is missing', async () => {
    await expectInvalid({
      login: 'user-login',
    });
  });

  it('rejects empty login', async () => {
    await expectInvalid({
      login: '',
      password: 'strong-password',
    });
  });

  it('rejects empty password', async () => {
    await expectInvalid({
      login: 'user-login',
      password: '',
    });
  });

  it('rejects non-string fields', async () => {
    await expectInvalid({
      login: 123,
      password: true,
    });
  });
});
