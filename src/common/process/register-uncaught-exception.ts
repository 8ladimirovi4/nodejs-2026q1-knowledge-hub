import { INestApplication } from '@nestjs/common';
import { AppLogger } from '../logger/app-logger.service';

export function registerUncaughtExceptionHandler(
  app: INestApplication,
  logger: AppLogger,
): void {
  let isShuttingDown = false;

  process.on('uncaughtException', (error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(err, 'uncaughtException');

    if (isShuttingDown) {
      process.exit(1);
    }
    isShuttingDown = true;

    void (async () => {
      try {
        await app.close();
      } catch (closeError) {
        const e =
          closeError instanceof Error
            ? closeError
            : new Error(String(closeError));
        logger.error(e, 'uncaughtException.shutdown');
      } finally {
        process.exit(1);
      }
    })();
  });
}
