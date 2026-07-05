export const logger = {
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  },
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  },
  warn: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  },
  error: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
};
