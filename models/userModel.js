const { mongoose } = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Must have name'],
  },
  email: {
    type: String,
    required: [true, 'Must have Email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please Enter Valid Email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'Must have Password'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please Comfirm Password'],
    //only work for save and create not for update so use save for update the user for using validator
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Password is Not Same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // isModified is preDefined method is use for check filed modified or not
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    //after validation we dont need this conform password field on data base so we write this
    this.passwordConfirm = undefined;
    next();
  }
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async (
  canndidatePassword,
  userPassword
) => {
  return await bcrypt.compare(canndidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const restToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(restToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return restToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
