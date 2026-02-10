import { createConsola } from 'consola';

function formatDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const sec = pad(date.getSeconds());
  return `${d}/${m}/${y} ${h}:${min}:${sec}`;
}

export function createLogger(tag) {
  const logger = createConsola({
    level: 4, // debug level
    formatOptions: {
      date: false, // kita handle sendiri
      colors: true,
      compact: false,
    },
  }).withTag(tag);

  return {
    info: (msg) => logger.info(`[${formatDate()}] ${msg}`),
    success: (msg) => logger.success(`[${formatDate()}] ${msg}`),
    warn: (msg) => logger.warn(`[${formatDate()}] ${msg}`),
    error: (msg) => logger.error(`[${formatDate()}] ${msg}`),
    debug: (msg) => logger.debug(`[${formatDate()}] ${msg}`),
    start: (msg) => logger.start(`[${formatDate()}] ${msg}`),
    ready: (msg) => logger.ready(`[${formatDate()}] ${msg}`),
    box: (msg) => logger.box(msg),
  };
}
