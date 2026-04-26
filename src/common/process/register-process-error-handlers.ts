import { INestApplication } from '@nestjs/common';
import { AppLogger } from '../logger/app-logger.service';

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

export function registerProcessErrorHandlers(
  app: INestApplication,
  logger: AppLogger,
): void {
  let isShuttingDown = false;

  const gracefulShutdown = (context: string) => {
    if (isShuttingDown) {
      process.exit(1);
    }
    isShuttingDown = true;

    void (async () => {
      try {
        await app.close();
      } catch (closeError) {
        logger.error(toError(closeError), `${context}.shutdown`);
      } finally {
        process.exit(1);
      }
    })();
  };

  process.on('uncaughtException', (error: unknown) => {
    const err = toError(error);
    logger.error(err, 'uncaughtException');
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const err = toError(reason);
    logger.error(err, 'unhandledRejection');
    gracefulShutdown('unhandledRejection');
  });
}
