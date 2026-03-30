// Augment Express Request with application-specific properties.
// This file is auto-included by tsconfig (src/**/*.ts).

declare namespace Express {
  interface Request {
    /**
     * Authenticated user ID, set by the userContext middleware.
     * Always present on routes that go through the middleware.
     */
    userId: string;

    /**
     * Validated and transformed query parameters, set by the validate middleware.
     * In Express 5 `req.query` is read-only, so transformed/coerced query data
     * (with Zod defaults and type coercions applied) is stored here instead.
     */
    validatedQuery: Record<string, unknown>;
  }
}
