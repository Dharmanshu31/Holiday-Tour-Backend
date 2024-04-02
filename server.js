const dotenv = require('dotenv').config({ path: './config.env' });
const app = require('./app');
const mongoose = require('mongoose');

//if ther is anything that is not define then this will catch and send the error
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  process.exit(1);
});

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB)
  .then(() => console.log('connected succefully'))
  .catch((err) => console.log(err, "Can't connect DataBase")); // alwasy use this type of error handling insed of globle as we did blow with procces.on

// const testTour = new Tour({
//   name: 'amzone Forest',
//   rating: 4.5,
//   prise: 599,
// });
// testTour
//   .save()
//   .then((doc) => console.log(doc))
//   .catch((err) => console.log(err));
const port = 3000;
const server = app.listen(port, () => {
  console.log(`server working on port number ${port}`);
});
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
