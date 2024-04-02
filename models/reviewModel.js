const mongoose = require('mongoose');
const Tour = require('./toureModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Can`t post empty review'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createAt: {
      type: Date,
      default: Date.now,
    },
    //Parent refrencing every review contain id of parent tour
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Must Belong To one Tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have User'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// reviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'tour',
//     select: 'name',
//   });
//   this.populate({
//     path: 'user',
//     select: 'name photo',
//   });
//   next();
// });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//we crate static method for geting access of Review model befor it create so for that we use static insted of instance method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //if there is no review left then just make it to defualt
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//for stoping user for posting multipal review for same tour we user index combination
reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); //provide additional obj for make combination unique

reviewSchema.post('save', function () {
  //now currently this stand for current review for geting access of Review model befor it create we use this.constructer
  this.constructor.calcAverageRatings(this.tour);
});

//for findByIdAndUpdate and same as delete we just have query midlware not documnet so we can't write on documnet
//for writing we use trick for that we find query with findOneAnd and use this.findOne to get access of current document and
//stor in to this.r for passing to post middelware
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //point to cuurent query in new version we need to use clone().findOne for working this
  this.r = await this.clone().findOne();
  next();
});
//cant use this.find one because query alredy exicuted in post and we use post to update data for get right calc
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
