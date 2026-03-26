module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  
  // Deteksi bahasa dari header, default ke English
  const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

  // Log error untuk developer (Terminal)
  if (process.env.NODE_ENV === "development") {
    console.error("🔥 Error Log:", err);
  }

  // Pesan default berdasarkan bahasa
  let message = err.message || (lang === 'id' ? "Terjadi kesalahan pada server." : "Internal Server Error.");

  // 1. JWT Errors (Authentication)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = lang === 'id' ? "Token tidak valid, silakan login kembali." : "Invalid token, please login again.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = lang === 'id' ? "Sesi telah berakhir, silakan login ulang." : "Session expired, please login again.";
  }

  // 2. Mongoose Validation Error (Input tidak sesuai schema)
  if (err.name === "ValidationError") {
    statusCode = 400;
    // Mengambil pesan error pertama dari list validasi Mongoose
    const firstError = Object.values(err.errors)[0]?.message;
    message = firstError || (lang === 'id' ? "Data input tidak valid." : "Invalid input data.");
  }

  // 3. Mongoose Bad ObjectId (ID Salah format)
  if (err.name === "CastError") {
    statusCode = 400;
    message = lang === 'id' 
      ? `Resource tidak ditemukan dengan id: ${err.value}` 
      : `Resource not found with id: ${err.value}`;
  }

  // 4. Mongoose Duplicate Key (Email/Username sudah terdaftar)
  if (err.code === 11000) {
    statusCode = 400;
    message = lang === 'id' 
      ? "Data (email/username) sudah terdaftar dalam sistem." 
      : "Data (email/username) is already registered in the system.";
  }

  // 5. Multer Specific Errors
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = lang === 'id' ? "Ukuran file terlalu besar! Maksimal 2MB." : "File too large! Maximum limit is 2MB.";
  }
  
  // Error dari file filter multer (yang kita throw manual di route)
  if (err.message.includes("format") || err.message.includes("supported")) {
    statusCode = 400;
    // Jika pesan aslinya sudah bahasa Inggris dari route, biarkan saja
  }

  // Kirim Response JSON yang seragam
  res.status(statusCode).json({
    success: false,
    message,
    // Stack trace hanya muncul saat development mode agar memudahkan debugging
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};