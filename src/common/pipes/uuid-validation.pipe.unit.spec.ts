import { ArgumentMetadata } from '@nestjs/common';
import { ValidationError } from 'src/common/errors';
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

  it('returns value for valid UUID v4', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    expect(pipe.transform(uuid, metadata)).toBe(uuid);
  });

  it('throws ValidationError for invalid uuid', () => {
    expect(() => pipe.transform('invalid-uuid', metadata)).toThrow(
      ValidationError,
    );
  });

  it('throws ValidationError for uuid with wrong version', () => {
    const uuidV1 = '11111111-1111-1111-8111-111111111111';
    expect(() => pipe.transform(uuidV1, metadata)).toThrow(ValidationError);
  });
});
