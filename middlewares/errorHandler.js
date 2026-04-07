module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  
  // Log error for developers (Terminal)
  if (process.env.NODE_ENV === "development") {
    console.error("🔥 Error Log:", err);
  }

  // Default message
  let message = err.message || "Internal Server Error.";

  // 1. JWT Errors (Authentication)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token, please login again.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired, please login again.";
  }

  // 2. Mongoose Validation Error (Input does not match schema)
  if (err.name === "ValidationError") {
    statusCode = 400;
    // Get the first error message from the Mongoose validation list
    const firstError = Object.values(err.errors)[0]?.message;
    message = firstError || "Invalid input data.";
  }

  // 3. Mongoose Bad ObjectId (Invalid ID format)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Resource not found with id: ${err.value}`;
  }

  // 4. Mongoose Duplicate Key (Email/Username is already registered)
  if (err.code === 11000) {
    statusCode = 400;
    message = "Data (email/username) is already registered in the system.";
  }

  // 5. Multer Specific Errors
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File too large! Maximum limit is 2MB.";
  }
  
  // Error from multer file filter (manually thrown in the route)
  if (err.message.includes("format") || err.message.includes("supported")) {
    statusCode = 400;
    // If the original message is already in English from the route, leave it alone
  }

  // Send uniform JSON Response
  res.status(statusCode).json({
    success: false,
    message,
    // Stack trace only appears in development mode to ease debugging
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};