const nodemailer = require('nodemailer');
const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

// Create reusable transporter (configured for SMTP or use Ethereal test)
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT || 587,
        secure: false, // true for 465
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      });
    } else {
      // Fallback to Ethereal test account (prints login info in console)
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'your-ethereal-user@ethereal.email', // will be overridden at runtime
          pass: 'your-ethereal-pass',
        },
      });
      // Auto-generate test account on first use
      (async () => {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        console.log('📧 Email configured with Ethereal test account:');
        console.log(`   User: ${testAccount.user}`);
        console.log(`   Pass: ${testAccount.pass}`);
        console.log(`   Preview URL: https://ethereal.email/login`);
      })();
    }
  }
  return transporter;
};

exports.sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"ZENO Parking" <${process.env.EMAIL_FROM || 'noreply@zeno.com'}>`,
      to,
      subject,
      text: text || '',
      html: html || '',
    });
    console.log('✅ Email sent:', info.messageId);
    // Ethereal: log preview URL
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log(`🔗 Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (err) {
    console.error('❌ Email send error:', err.message);
    // Do not throw – we don't want to break the flow
    return null;
  }
};