// Express 4 doesn't forward rejected promises from async handlers to the error
// middleware - an uncaught rejection becomes a process-level crash instead of a
// 500 response. Wrap every route handler with this so a DB error (or anything
// else) always reaches the centralized error handler in server.js.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
