import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { UuidValidationPipe } from './uuid-validation.pipe';

describe('UuidValidationPipe', () => {
  const metadata: ArgumentMetadata = {
    type: 'param',
    metatype: String,
    data: 'id',
  };

  let pipe: UuidValidationPipe;

  beforeEach(() => {
    pipe = new UuidValidationPipe();
  });

  it('returns value for valid UUID v4', async () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    await expect(pipe.transform(uuid, metadata)).resolves.toBe(uuid);
  });

  it('throws BadRequestException for invalid uuid', async () => {
    await expect(pipe.transform('invalid-uuid', metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException for uuid with wrong version', async () => {
    const uuidV1 = '11111111-1111-1111-8111-111111111111';
    await expect(pipe.transform(uuidV1, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
