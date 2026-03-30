//@ts-ignore
import colors from 'colors';
//@ts-ignore
import nodemailer from 'nodemailer';
import { errorLogger, logger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { config } from '../config';

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.smtp.username,
    pass: config.smtp.password,
  },
});

// Verify transporter connection
if (config.environment !== 'test') {
  transporter
    .verify()
    .then(() => logger.info(colors.cyan('📧  Connected to email server')))
    .catch(err =>
      logger.warn(
        'Unable to connect to email server. Make sure you have configured the SMTP options in .env'
      )
    );
}

// Function to send email
const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `${config.smtp.emailFrom}`, // sender address
      to: values.to, // list of receivers
      subject: values.subject, // subject line
      html: values.html, // html body
    });
    logger.info('Mail sent successfully', info.accepted);
  } catch (error) {
    errorLogger.error('Email', error);
  }
};

const sendVerificationEmail = async (to: string, otp: string) => {
  const subject = 'Verify Your Email Address';
  const html = `
    <div style="width: 45% ; margin: 0 auto ;font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Email Verification</h1>
        <p style="font-size: 16px;">Thank you for signing up! Please verify your email address to complete the registration process. If you did not create an account with us, please disregard this email.</p>
      </div>
      <div style="text-align: center;">
        <h2 style="background-color: #f4f4f4; padding: 10px 20px; display: inline-block; border-radius: 5px; color: #1B9AAA; font-size: 35px;">${otp}</h2>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">This code is valid for 3 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

const sendResetPasswordEmail = async (to: string, otp: string) => {
  const subject = 'Reset Your Password';
  const html = `
   <div style="width: 45% ; margin: 0 auto ;font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Password Reset Request</h1>
        <p style="font-size: 16px;">We received a request to reset your password. Use the code below to proceed with resetting your password:</p>
      </div>
      <div style="text-align: center;">
        <h2 style="background-color: #f4f4f4; padding: 10px 20px; display: inline-block; border-radius: 5px; color: #1B9AAA; font-size: 35px;">${otp}</h2>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">This code is valid for 3 minutes. If you did not request a password reset, please disregard this email and contact support if needed.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

/** ---------------------------------------------- Fertie | Kaz Bd
   * @role Admin
   * @Section Create Sub Admin
   * @desc We send email after creating sub admin .. 
   * 
   *----------------------------------------------*/
const sendAdminOrSuperAdminCreationEmail = async (
  email: string,
  role: string,
  password: string,
  message?: string // Optional custom message
) => {
  const subject = `Congratulations! You are now an ${role}`;
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Congratulations! You are now an ${role}</h1>
        <p style="font-size: 16px;">You have been granted ${role} access to the system. Use the credentials below to log in:</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 16px; font-weight: bold;">Email: <span style="color: #1B9AAA;">${email}</span></p>
        <p style="font-size: 16px; font-weight: bold;">Temporary Password: <span style="color: #1B9AAA;">${password}</span></p>
      </div>
      
      ${
        message
          ? `<div style="margin-top: 20px; padding: 15px; background-color: #f4f4f4; border-radius: 10px;">
              <p style="font-size: 14px; text-align: center; color: #555;">${message}</p>
            </div>`
          : ''
      }

      <p style="font-size: 14px; text-align: center; margin-top: 20px;">For security reasons, please log in and change your password immediately.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, html });
};
// Function to send a Welcome Email
const sendWelcomeEmail = async (to: string, password: string) => {
  const subject = 'Welcome to the Platform!';
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Welcome to the Platform!</h1>
        <p style="font-size: 16px;">We are excited to have you join us. Your account has been created successfully. Use the following credentials to log in:</p>
      </div>
      <div style="text-align: center;">
        <p style="font-size: 16px; font-weight: bold;">Email: <span style="color: #1B9AAA;">${to}</span></p>
        <p style="font-size: 16px; font-weight: bold;">Temporary Password: <span style="color: #1B9AAA;">${password}</span></p>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">For security reasons, please log in and change your password immediately.</p>
    </div>
  `;
  await sendEmail({ to, subject, html });
};

/**
 * Send Child Account Creation Email with Login Credentials
 * Figma: create-child-flow.png (Create Member)
 * Sent when a parent/teacher creates a child account
 *
 * @param to - Child's email address
 * @param childName - Child's name
 * @param password - Temporary password (plain text, will be hashed in DB)
 * @param parentName - Parent/Teacher name who created the account
 */
const sendChildAccountCredentialsEmail = async (
  to: string,
  childName: string,
  password: string,
  parentName: string
) => {
  const subject = 'Welcome! Your Account Has Been Created';
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Welcome, ${childName}!</h1>
        <p style="font-size: 16px;">
          ${parentName} has created an account for you on the Task Management Platform.
          You can now log in and start managing your tasks.
        </p>
      </div>
      <div style="text-align: center; background-color: #f4f4f4; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h2 style="color: #1B9AAA; margin-bottom: 15px;">Your Login Credentials</h2>
        <p style="font-size: 16px; font-weight: bold; margin: 10px 0;">
          Email: <span style="color: #1B9AAA;">${to}</span>
        </p>
        <p style="font-size: 16px; font-weight: bold; margin: 10px 0;">
          Password: <span style="color: #1B9AAA;">${password}</span>
        </p>
      </div>
      <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 10px; border-left: 4px solid #ffc107;">
        <p style="font-size: 14px; color: #856404; margin: 0;">
          <strong>⚠️ Important Security Notice:</strong><br/>
          For your security, please log in and change your password immediately.
        </p>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">
        If you have any questions, please contact ${parentName} or your system administrator.
      </p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};
const sendSupportMessageEmail = async (
  userEmail: string,
  userName: string,
  subject: string,
  message: string
) => {
  const adminEmail = config.smtp.emailFrom; // Admin email from config
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">New Support Message</h1>
        <p style="font-size: 16px;"><strong>From:</strong> ${userName} (${userEmail})</p>
        <p style="font-size: 16px;"><strong>Subject:</strong> ${subject}</p>
        <p style="font-size: 16px;">${message}</p>
      </div>
      <p style="font-size: 14px; text-align: center; margin-top: 20px;">Please respond to the user as soon as possible.</p>
    </div>
  `;

  await sendEmail({
    to: adminEmail || '',
    subject: `Support Request from ${userName}`,
    html,
  });
};
export {
  sendEmail,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendAdminOrSuperAdminCreationEmail,
  sendSupportMessageEmail,
  sendWelcomeEmail,
  sendChildAccountCredentialsEmail,
  sendInvitationEmail,
};

/**
 * Send Invitation Email for Child Account Activation
 * Figma: create-child-flow.png (Invitation flow variant)
 * Sent when parent chooses "Child sets own password" option
 *
 * @param to - Child's email address
 * @param childName - Child's name
 * @param activationToken - Activation token for deep link
 * @param parentName - Parent/Teacher name who sent invitation
 */
const sendInvitationEmail = async (
  to: string,
  childName: string,
  activationToken: string,
  parentName: string
) => {
  const subject = '🎉 You\'re invited to join Task Management!';
  
  // Deep link for mobile app (Universal Link / App Link)
  const activationLink = `${config.frontend.appUrl}/activate?token=${activationToken}`;
  
  const html = `
    <div style="width: 45%; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #ccc; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.backend.shobhoyUrl}uploads/logoForEmail/kajbdlogo.jpg" alt="Logo" style="width: 200px; margin-bottom: 20px;" />
        <h1 style="color: #1B9AAA;">Welcome, ${childName}! 🎉</h1>
        <p style="font-size: 16px;">
          ${parentName} has invited you to join the Task Management Platform!
          This platform will help you manage your tasks and achieve your goals.
        </p>
      </div>
      
      <div style="background-color: #f4f4f4; padding: 25px; border-radius: 10px; margin: 20px 0;">
        <h2 style="color: #1B9AAA; margin-bottom: 15px; text-align: center;">Get Started in 3 Easy Steps</h2>
        
        <div style="margin: 20px 0;">
          <p style="font-size: 16px; font-weight: bold; color: #333;">1️⃣ Download the App</p>
          <div style="text-align: center; margin: 15px 0;">
            <a href="https://apps.apple.com/app/task-management" style="text-decoration: none; margin: 0 5px;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" style="height: 50px;" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.taskmgmt.app" style="text-decoration: none; margin: 0 5px;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge.svg" alt="Google Play" style="height: 50px;" />
            </a>
          </div>
        </div>
        
        <div style="margin: 20px 0;">
          <p style="font-size: 16px; font-weight: bold; color: #333;">2️⃣ Activate Your Account</p>
          <div style="text-align: center; margin: 15px 0;">
            <a href="${activationLink}" 
               style="background-color: #1B9AAA; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
              ✅ Activate Account
            </a>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center; margin-top: 10px;">
            Or click this link:<br/>
            <a href="${activationLink}" style="color: #1B9AAA; word-break: break-all;">${activationLink}</a>
          </p>
        </div>
        
        <div style="margin: 20px 0;">
          <p style="font-size: 16px; font-weight: bold; color: #333;">3️⃣ Set Your Password & Start!</p>
          <p style="font-size: 14px; color: #666; text-align: center;">
            Choose a strong password and start managing your tasks effectively.
          </p>
        </div>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 10px; border-left: 4px solid #ffc107;">
        <p style="font-size: 14px; color: #856404; margin: 0;">
          <strong>⏰ Invitation Expires:</strong><br/>
          This invitation link is valid for 24 hours only.
        </p>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 10px; border-left: 4px solid #1B9AAA;">
        <p style="font-size: 14px; color: #0c5460; margin: 0;">
          <strong>🔒 Security Tips:</strong><br/>
          • Choose a strong password (min 8 characters)<br/>
          • Don't share your password with anyone<br/>
          • You can change your password anytime in settings
        </p>
      </div>
      
      <p style="font-size: 14px; text-align: center; margin-top: 20px; color: #666;">
        If you have any questions, feel free to reach out to ${parentName} or our support team.
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          © 2026 Task Management Platform. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await sendEmail({ to, subject, html });
};
