import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface OptionalAuthRequest extends Request {
  user?: AuthUser;
}

