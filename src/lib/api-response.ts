import { NextResponse } from 'next/server';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
};

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) });
}

export function err(
  message: string,
  status = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function unauthorized(): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: 'Unauthorized. Please sign in.' },
    { status: 401 }
  );
}

export function notFound(resource = 'Resource'): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: `${resource} not found` },
    { status: 404 }
  );
}

export function serverError(e: unknown): NextResponse<ApiResponse<never>> {
  const message =
    e instanceof Error ? e.message : 'An unexpected error occurred';
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export function forbidden(): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: 'You do not have permission to access this resource' },
    { status: 403 }
  );
}
