import { HttpStatus } from '@nestjs/common';

export class NotFoundError extends Error {
  readonly statusCode = HttpStatus.NOT_FOUND; //code 404

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = HttpStatus.BAD_REQUEST; //code 400

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  readonly statusCode = HttpStatus.UNAUTHORIZED; //401

  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = HttpStatus.FORBIDDEN; //403

  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
