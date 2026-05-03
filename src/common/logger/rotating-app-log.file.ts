import {
  createStream,
  type Generator,
  type RotatingFileStream,
} from 'rotating-file-stream';
import {
  ensureLogDirectory,
  getLogMaxFileSizeKb,
} from '../config/log-file.config';

const ACTIVE_LOG_NAME = 'app.log';

const generator = ((time, index) => {
  if (time == null) {
    return ACTIVE_LOG_NAME;
  }
  const d = time instanceof Date ? time : new Date(time);
  const ts = d
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '');
  const idx = index != null && index > 0 ? `-${index}` : '';
  return `app-${ts}${idx}.log`;
}) as Generator;

export function openRotatingAppLogStream(): RotatingFileStream | null {
  const logDir = ensureLogDirectory();
  const sizeKb = getLogMaxFileSizeKb();
  const size: `${number}K` = `${sizeKb}K`;

  try {
    const stream = createStream(generator, {
      path: logDir,
      size,
    });
    stream.on('error', (err) => {
      console.error('[AppLogger] Rotating file stream error:', err);
    });
    return stream;
  } catch (err) {
    console.error('[AppLogger] Failed to open log file stream:', err);
    return null;
  }
}
