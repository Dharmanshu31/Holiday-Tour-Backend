const AppError = require('../utils/appError');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'Error';
  //for invalid id
  if (err.name == 'CastError') {
    err = new AppError(`Invalid ${err.path}:${err.value}`, 404);
  }
  // for duplicate unique key
  if (err.code == 11000) {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    err = new AppError(`Duplicate value ${value} please use unique value`, 400);
  }
  //update data with invalid data
  if (err.name == 'ValidationError') {
    const error = Object.values(err.errors).map((el) => el.message);
    err = new AppError(`Invalid Input Data. ${error.join('. ')}`, 404);
  }
  if (err.name == 'JsonWebTokenError') {
    err = new AppError(`Invalid webToken Login again!!!`, 401);
  }
  if (err.name == 'TokenExpiredError') {
    err = new AppError(`Your token is Expired`, 401);
  }
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
