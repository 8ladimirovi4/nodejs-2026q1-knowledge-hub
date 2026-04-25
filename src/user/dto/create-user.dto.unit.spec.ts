import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../../storage/domain.types';
import { CreateUserDto } from './create-user.dto';

async function expectValid(plain: object) {
  const dto = plainToInstance(CreateUserDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(CreateUserDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

describe('CreateUserDto', () => {
  it('accepts valid payload with login and password', async () => {
    await expectValid({
      login: 'alice',
      password: 'secret123',
    });
  });

  it('accepts valid payload with role', async () => {
    await expectValid({
      login: 'bob',
      password: 'secret123',
      role: UserRole.EDITOR,
    });
  });

  it('fails when login is missing', async () => {
    await expectInvalid({ password: 'x' });
  });

  it('fails when password is missing', async () => {
    await expectInvalid({ login: 'x' });
  });

  it('fails when login is empty string', async () => {
    await expectInvalid({ login: '', password: 'x' });
  });

  it('fails when password is empty string', async () => {
    await expectInvalid({ login: 'x', password: '' });
  });

  it('fails on invalid enum for role', async () => {
    await expectInvalid({
      login: 'x',
      password: 'y',
      role: 'superadmin',
    });
  });
});
