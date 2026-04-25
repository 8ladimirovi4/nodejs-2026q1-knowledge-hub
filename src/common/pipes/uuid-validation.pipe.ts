import {
  ArgumentMetadata,
  Injectable,
  ParseUUIDPipe,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class UuidValidationPipe
  implements PipeTransform<string, Promise<string>>
{
  private readonly parseUuidPipe = new ParseUUIDPipe({ version: '4' });

  transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    return this.parseUuidPipe.transform(value, metadata);
  }
}
