import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../../storage/domain.types';
import { UpdateUserDto } from './update-user.dto';

async function expectValid(plain: object) {
  const dto = plainToInstance(UpdateUserDto, plain);
  const errors = await validate(dto);
  expect(errors).toHaveLength(0);
}

async function expectInvalid(plain: object) {
  const dto = plainToInstance(UpdateUserDto, plain);
  const errors = await validate(dto);
  expect(errors.length).toBeGreaterThan(0);
}

describe('UpdateUserDto', () => {
  it('accepts empty object (all fields optional)', async () => {
    await expectValid({});
  });

  it('accepts valid partial update', async () => {
    await expectValid({ login: 'newlogin' });
  });

  it('accepts valid role', async () => {
    await expectValid({ role: UserRole.VIEWER });
  });

  it('fails when login is empty string if provided', async () => {
    await expectInvalid({ login: '' });
  });

  it('fails on invalid enum for role', async () => {
    await expectInvalid({ role: 'invalid' });
  });
});
