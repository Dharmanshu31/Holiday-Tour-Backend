const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    // for sending email through gmail use gmail provider and use your email and for password create password with your gmail account under two step verification section
    // service: 'gmail',
    // auth: {
    //   user: 'youremail@gmail.com',
    //   pass: 'yourpassword',
    // },
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  const mailOptions = {
    from: 'Dharmanshu <hello@jonas.io>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
