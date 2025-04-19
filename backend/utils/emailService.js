const nodemailer = require('nodemailer');

// Test hesabı oluşturma (development ortamında)
// Production'da gerçek SMTP bilgilerinizi kullanın
let transporter;

const createTransporter = async () => {
  // Gerçek SMTP bilgileri varsa burada kullanın
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  // Test hesabı oluşturma - sadece development için
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

// E-posta gönderme
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      transporter = await createTransporter();
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'takas@example.com',
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-posta gönderildi: %s', info.messageId);
    
    // Ethereal test hesabı kullanılıyorsa URL'yi console'da göster
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('E-posta önizleme URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('E-posta gönderilirken hata oluştu:', error);
    throw error;
  }
};

// E-posta şablonları
const emailTemplates = {
  verification: (token, username) => {
    return `
      <h1>Merhaba ${username},</h1>
      <p>Takas Platformu'na hoş geldiniz!</p>
      <p>Hesabınızı doğrulamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
      <a href="${process.env.CLIENT_URL}/verify-email?token=${token}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">E-posta Adresimi Doğrula</a>
      <p>Bu bağlantı 24 saat boyunca geçerlidir.</p>
      <p>Teşekkürler,<br>Takas Platformu Ekibi</p>
    `;
  },
  
  resetPassword: (token, username) => {
    return `
      <h1>Merhaba ${username},</h1>
      <p>Şifrenizi sıfırlamak için bir istek aldık.</p>
      <p>Şifrenizi sıfırlamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
      <a href="${process.env.CLIENT_URL}/reset-password?token=${token}" style="padding: 10px 15px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
      <p>Bu bağlantı 1 saat boyunca geçerlidir.</p>
      <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
      <p>Teşekkürler,<br>Takas Platformu Ekibi</p>
    `;
  },
  
  welcome: (username) => {
    return `
      <h1>Merhaba ${username},</h1>
      <p>Takas Platformu'na hoş geldiniz!</p>
      <p>Hesabınız başarıyla doğrulandı ve artık platformumuzun tüm özelliklerinden yararlanabilirsiniz.</p>
      <p>Herhangi bir sorunuz olursa, lütfen bizimle iletişime geçmekten çekinmeyin.</p>
      <p>Teşekkürler,<br>Takas Platformu Ekibi</p>
    `;
  }
};

module.exports = {
  sendEmail,
  emailTemplates
}; 