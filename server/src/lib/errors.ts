export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'app_error',
  ) {
    super(message);
  }
}

export function friendlyMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return 'Toodle tripped. Try again.';
}

export function throwDb(error: { message: string } | null, context: string): void {
  if (!error) return;
  console.error(context, error.message);
  if (/does not exist|schema cache|relation|function/i.test(error.message)) {
    throw new AppError(503, 'Database is not ready. Run the Toodle migration in Supabase.');
  }
  throw new AppError(500, 'Toodle tripped. Try again.');
}
