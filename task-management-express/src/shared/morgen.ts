import { Request, Response } from 'express';
import morgan from 'morgan';
import { errorLogger, logger } from './logger';
import { config } from '../config';
import { IUser } from '../modules/token/token.interface';

morgan.token(
  'message',
  (req: Request, res: Response) => res?.locals.errorMessage || ''
);

morgan.token('user', (req: Request) => 
  (req.user as IUser)?.userId || 'anonymous'
);

morgan.token('userName', (req: Request) => 
  (req.user as IUser)?.userName || 'anonymous'
);

morgan.token('request-id', (req: Request) => 
  (req.headers['x-request-id'] as string) || '-'
);

morgan.token('body-size', (req: Request) => 
  req.headers['content-length'] || '0'
);

const getIpFormat = () =>
  config.environment === 'development' ? ':remote-addr - ' : '';
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms :userName - :user`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms :userName - :user`;

const successHandler = morgan(successResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode >= 400,
  stream: { write: (message: string) => logger.info(message.trim()) },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (req: Request, res: Response) => res.statusCode < 400,
  stream: { write: (message: string) => errorLogger.error(message.trim()) },
});

export const Morgan = { errorHandler, successHandler };
