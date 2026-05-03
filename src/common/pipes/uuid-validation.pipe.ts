import { Injectable, PipeTransform } from '@nestjs/common';
import { validate, version } from 'uuid';
import { ValidationError } from 'src/common/errors';

@Injectable()
export class UuidValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !validate(value) || version(value) !== 4) {
      throw new ValidationError('id must be a valid UUID v4');
    }
    return value;
  }
}
