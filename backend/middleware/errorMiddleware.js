// Middleware to catch 404 (Not Found) routes
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Passes the error to the global handler below
};

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // If the status code is 200 (default), change it to 500 (Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    message: err.message,
    // Only show stack trace in development mode (never show it in production!)
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
