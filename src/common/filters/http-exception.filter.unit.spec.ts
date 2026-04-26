import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createHost(url: string, response: MockResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: MockResponse;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    filter = new HttpExceptionFilter();
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('formats HttpException with status/message/error', () => {
    const host = createHost('/user', response);

    filter.catch(new BadRequestException('Validation failed'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Bad Request',
        path: '/user',
        timestamp: expect.any(String),
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Validation failed',
      expect.any(String),
    );
  });

  it('formats HttpException when response is a string', () => {
    const host = createHost('/auth/login', response);

    filter.catch(
      new HttpException('Custom failure', HttpStatus.CONFLICT),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'Custom failure',
        error: 'Error',
        path: '/auth/login',
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith('Custom failure', expect.any(String));
  });

  it('formats unknown errors as 500 Internal Server Error', () => {
    const host = createHost('/articles', response);

    filter.catch(new Error('db down'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        path: '/articles',
        timestamp: expect.any(String),
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith('db down', expect.any(String));
  });

  it('logs non-Error throwables at error level without a stack argument', () => {
    const host = createHost('/x', response);

    filter.catch('plain-string-throw' as unknown, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled exception (non-Error): plain-string-throw',
    );
  });
});
