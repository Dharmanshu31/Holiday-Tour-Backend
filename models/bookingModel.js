const mongoose = require('mongoose');
const validator = require('validator');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belongs to a Tour!!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belongs to a User!!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking Must Have price'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
