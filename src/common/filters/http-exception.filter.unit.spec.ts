import {
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors';
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

  it('formats ValidationError with status/message/error', () => {
    const host = createHost('/user', response);

    filter.catch(new ValidationError('Validation failed'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'BAD_REQUEST',
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

  it('joins array message and uses explicit error from HttpException object response', () => {
    const host = createHost('/auth/refresh', response);
    const ex = new HttpException(
      {
        message: ['field a is invalid', 'field b is invalid'],
        error: 'Validation Failed',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(ex, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'field a is invalid, field b is invalid',
        error: 'Validation Failed',
        path: '/auth/refresh',
      }),
    );
  });

  it('uses default message and HttpStatus name when HttpException object has no message/error', () => {
    const host = createHost('/auth/refresh', response);
    const ex = new HttpException({}, HttpStatus.BAD_REQUEST);

    filter.catch(ex, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Internal server error',
        error: 'BAD_REQUEST',
        path: '/auth/refresh',
      }),
    );
  });

  it('uses message from HttpException object response when it is a string field', () => {
    const host = createHost('/users', response);
    const ex = new HttpException(
      {
        message: 'Payload validation failed',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(ex, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Payload validation failed',
        error: 'BAD_REQUEST',
        path: '/users',
      }),
    );
  });

  it('falls back to "Error" when HttpException status has no enum name', () => {
    const host = createHost('/custom-status', response);
    const ex = new HttpException({}, 499);

    filter.catch(ex, host);

    expect(response.status).toHaveBeenCalledWith(499);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 499,
        message: 'Internal server error',
        error: 'Error',
        path: '/custom-status',
      }),
    );
  });

  it.each([
    [
      new NotFoundError('Resource missing'),
      HttpStatus.NOT_FOUND,
      'Resource missing',
      'NOT_FOUND',
    ],
    [
      new ValidationError('Invalid input'),
      HttpStatus.BAD_REQUEST,
      'Invalid input',
      'BAD_REQUEST',
    ],
    [
      new UnauthorizedError('No session'),
      HttpStatus.UNAUTHORIZED,
      'No session',
      'UNAUTHORIZED',
    ],
    [
      new ForbiddenError('Not allowed'),
      HttpStatus.FORBIDDEN,
      'Not allowed',
      'FORBIDDEN',
    ],
  ] as const)(
    'maps %s to status %i with message and HttpStatus name',
    (err, expectedStatus, expectedMessage, expectedErrorName) => {
      const host = createHost('/custom', response);

      filter.catch(err, host);

      expect(response.status).toHaveBeenCalledWith(expectedStatus);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expectedStatus,
          message: expectedMessage,
          error: expectedErrorName,
          path: '/custom',
          timestamp: expect.any(String),
        }),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expectedMessage,
        expect.any(String),
      );
    },
  );

  it('falls back to "Error" label for custom error with unknown statusCode', () => {
    const host = createHost('/custom', response);
    const err = new ValidationError('Validation failed');
    Object.defineProperty(err, 'statusCode', { value: 499 });

    filter.catch(err, host);

    expect(response.status).toHaveBeenCalledWith(499);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 499,
        message: 'Validation failed',
        error: 'Error',
        path: '/custom',
      }),
    );
  });

  it('formats unknown errors as assignment-compliant 500 response', () => {
    const host = createHost('/articles', response);

    filter.catch(new Error('db down'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        error: 'Internal Server Error',
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

  it('logs Error without stack using fallback stack message', () => {
    const host = createHost('/x', response);
    const err = new Error('boom');
    Object.defineProperty(err, 'stack', { value: undefined });

    filter.catch(err, host);

    expect(errorSpy).toHaveBeenCalledWith('boom', 'No stack trace available');
  });
});
