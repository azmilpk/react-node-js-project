const errorHandler = (err, req, res, next) => {
  console.error(err);

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Expose client-error (4xx) messages; hide internal 5xx details in production.
  let message;
  if (status < 500) {
    message = err.message || 'Request error';
  } else {
    message = isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error';
  }

  res.status(status).json({ message });
};

module.exports = errorHandler;