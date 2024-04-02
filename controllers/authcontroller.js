const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXP_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXP_IN * 24 * 60 * 60 * 1000
    ),
    secure: true, // make true when you are in productin because it work in https only
    httpOnly: true,
  });
  // to remove password from output when user create we have select=false so not show when you try other query but show on create thats why
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

exports.singup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  //   {
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   passwordConfirm: req.body.passwordConfirm,
  //   passwordChangedAt: req.body.passwordChangedAt,
  //   role: req.body.role,
  // }
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //check if email and password exist
  if (!email || !password) {
    return next(new AppError('Provide Email And Password', 400));
  }
  //check if user exist && password is correct
  const user = await User.findOne({ email }).select('+password'); //we make select:false in userModeal so know for accesign that pssword we expecite use select('+name of fild') and + to add that fild
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Email or Password is in Correct', 401));
  }
  //if ok then send token to client
  createSendToken(user, 200, res);
});

//miidlewar for stoping access of unauthorization user from route
exports.protect = catchAsync(async (req, res, next) => {
  //get token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('You are Not Login!!! login to get access!!!!', 401)
    );
  }
  //verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //check user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('User not Exist!! loging to get access'), 401);
  }
  //check user change pass after token is issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User Has Changed Password Login Again!!!!!'));
  }
  // get all access
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Don't have permission for that Operation`, 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is No User with this Email', 404));
  }
  //genetrate random tokan
  const resetToken = user.createPasswordResetToken();
  // to save the change that we made in token genreation and stop all the other validator
  await user.save({ validateBeforeSave: false });
  //send it to user email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPasswords/${resetToken}`;
  const message = `Forget your password click this link ${resetURL} to reset the password`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Reset password',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to Email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There is some problem in system try again', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new AppError('Invalid token or time is Expire!!! try Again'),
      400
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now() - 1000;
  await user.save();
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError(
        'Incorrect Old password enter correct password or reset password!!!',
        401
      )
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  createSendToken(user, 200, res);
});
