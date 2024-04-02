const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/toureModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //gte current tour
  const tour = await Tour.findById(req.params.tourID);
  //create checout session //all of this filed name come from stripe so dont change
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/booking/success`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'inr',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    // below two line is need to add if you have add us dowler any place and addres is out of india other wise do't need it
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['US'], // Assuming only US addresses allowed for non-INR transactions
    },
  });

  //create seession as per responce
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
