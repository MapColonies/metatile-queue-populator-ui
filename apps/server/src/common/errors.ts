export class HttpError extends Error {
  public constructor(
    public override message: string,
    public status: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
