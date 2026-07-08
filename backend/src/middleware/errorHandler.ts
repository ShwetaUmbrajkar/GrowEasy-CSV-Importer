import { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Unhandled error:", err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof Error && err.message.includes("Only .csv files")) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal server error" });
}
