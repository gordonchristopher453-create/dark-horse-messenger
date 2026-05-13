/**
 * Dark Horse Messenger - Email Utility
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"Dark Horse Messenger" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return true;

  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw new Error('Email could not be sent');
  }
};

/**
 * Welcome email template
 */
const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Dark Horse Messenger!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #7c3aed; text-align: center;">🐴 Dark Horse Messenger</h1>
        <h2 style="text-align: center;">Welcome, ${user.displayName}!</h2>
        <p style="color: #a0a0a0; text-align: center;">
          Your account has been created successfully.
          Start messaging your friends and family now!
        </p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.CLIENT_URL}" 
             style="background: #7c3aed; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Start Messaging
          </a>
        </div>
      </div>
    `
  });
};

/**
 * Password reset email template
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await send

