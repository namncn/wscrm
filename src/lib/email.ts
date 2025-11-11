import nodemailer from 'nodemailer'
import { getBrandName } from './utils'

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
})

interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  attachments?: EmailAttachment[]
}

export async function sendEmail({ to, subject, html, text, cc, attachments }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || getBrandName()}" <${process.env.SMTP_USER || 'noreply@example.com'}>` ,
      to,
      cc,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text
      attachments,
    })

    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  type: 'user' | 'customer' = 'user'
) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const verifyPath = type === 'customer' ? '/auth/verify-customer' : '/auth/verify'
  const verifyLink = `${appUrl}${verifyPath}?token=${verificationToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Xác nhận email</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại ${getBrandName()}. Vui lòng nhấp vào nút bên dưới để xác nhận địa chỉ email của bạn:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xác nhận email</a>
          </div>
          <p>Hoặc copy và paste link này vào trình duyệt:</p>
          <p style="word-break: break-all; color: #667eea;">${verifyLink}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">Link này sẽ hết hạn sau 24 giờ.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Xác nhận email - ${getBrandName()}`,
    html,
  })
}

export async function sendResetPasswordEmail(email: string, resetToken: string) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Đặt lại mật khẩu</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Đặt lại mật khẩu</a>
          </div>
          <p>Hoặc copy và paste link này vào trình duyệt:</p>
          <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">Link này sẽ hết hạn sau 1 giờ.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.</p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Đặt lại mật khẩu - ${getBrandName()}`,
    html,
  })
}

export async function sendWelcomeEmail(email: string, userName: string) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chào mừng đến với ${getBrandName()}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Chào mừng đến với ${getBrandName()}!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại ${getBrandName()}! Chúng tôi rất vui mừng được chào đón bạn.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="margin-top: 0; color: #667eea;">Bạn có thể làm gì với tài khoản của mình?</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Đăng ký và quản lý Tên miền</li>
              <li>Đặt mua các gói Hosting và VPS</li>
              <li>Theo dõi đơn hàng và thanh toán</li>
              <li>Quản lý dịch vụ của bạn</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Truy cập ${getBrandName()}</a>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Lưu ý quan trọng:</strong> Vui lòng kiểm tra email và xác nhận địa chỉ email của bạn để hoàn tất đăng ký và đảm bảo tính bảo mật cho tài khoản.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi qua email hoặc hệ thống hỗ trợ trong portal.
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${getBrandName()}</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            Email này được gửi tự động. Vui lòng không trả lời email này.
          </p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Chào mừng đến với ${getBrandName()}!`,
    html,
  })
}

export async function sendPasswordResetConfirmationEmail(email: string, userName: string) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const signinLink = `${appUrl}/auth/signin`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu thành công</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✓ Đặt lại mật khẩu thành công</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Mật khẩu của bạn đã được đặt lại thành công!</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 16px; color: #059669;">
              <strong>✓ Mật khẩu mới của bạn đã được lưu thành công.</strong>
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${signinLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Đăng nhập ngay</a>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Lưu ý bảo mật:</strong> Nếu bạn không thực hiện thay đổi mật khẩu này, vui lòng liên hệ với chúng tôi ngay lập tức để bảo vệ tài khoản của bạn.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi.
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${getBrandName()}</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            Email này được gửi tự động. Vui lòng không trả lời email này.
          </p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Đặt lại mật khẩu thành công - ${getBrandName()}`,
    html,
  })
}

export async function sendAdminVerificationEmail(email: string, userName: string, verificationToken: string, type: 'user' | 'customer' = 'user') {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const verifyLink = type === 'customer' 
    ? `${appUrl}/auth/verify-customer?token=${verificationToken}`
    : `${appUrl}/auth/verify?token=${verificationToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận tài khoản</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Xác nhận tài khoản của bạn</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Quản trị viên đã yêu cầu xác nhận tài khoản của bạn. Vui lòng nhấp vào nút bên dưới để xác nhận địa chỉ email và kích hoạt tài khoản:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xác nhận tài khoản</a>
          </div>
          <p>Hoặc copy và paste link này vào trình duyệt:</p>
          <p style="word-break: break-all; color: #667eea;">${verifyLink}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">Link này sẽ hết hạn sau 24 giờ.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Nếu bạn không nhận ra yêu cầu này, vui lòng liên hệ với quản trị viên.</p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Xác nhận tài khoản - ${getBrandName()}`,
    html,
  })
}

export async function sendEmailVerifiedConfirmationEmail(email: string, userName: string) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận email thành công</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✓ Email đã được xác nhận!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${userName}</strong>,</p>
          <p>Chúc mừng! Địa chỉ email của bạn đã được xác nhận thành công.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 16px; color: #059669;">
              <strong>✓ Tài khoản của bạn đã được kích hoạt hoàn toàn.</strong>
            </p>
          </div>

          <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
            <h2 style="margin-top: 0; color: #0ea5e9;">Bạn có thể bắt đầu:</h2>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Đăng ký và quản lý Tên miền</li>
              <li>Đặt mua các gói Hosting và VPS</li>
              <li>Theo dõi đơn hàng và thanh toán</li>
              <li>Truy cập đầy đủ các tính năng của hệ thống</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Bắt đầu sử dụng</a>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666;">
            Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi. Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.
          </p>
          
          <p style="margin-top: 30px;">
            Trân trọng,<br>
            <strong>Đội ngũ ${getBrandName()}</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            Email này được gửi tự động. Vui lòng không trả lời email này.
          </p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Email đã được xác nhận - ${getBrandName()}`,
    html,
  })
}

export async function sendEmailChangeVerificationEmail(
  newEmail: string,
  userName: string,
  verificationToken: string,
  accountType: 'user' | 'customer' = 'user',
  options: { oldEmail?: string } = {}
) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const verifyLink = `${appUrl}/auth/verify-email-change?token=${verificationToken}&type=${accountType}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận thay đổi email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Xác nhận thay đổi email</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p>Xin chào <strong>${userName || 'bạn'}</strong>,</p>
          <p>Bạn vừa yêu cầu thay đổi địa chỉ email tài khoản tại ${getBrandName()} ${
            options.oldEmail ? `từ <strong>${options.oldEmail}</strong> ` : ''
          }sang <strong>${newEmail}</strong>.</p>
          <p>Để hoàn tất yêu cầu này, vui lòng nhấp vào nút bên dưới để xác nhận email mới:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Xác nhận email mới</a>
          </div>
          <p>Nếu bạn không thể nhấp vào nút trên, vui lòng sao chép và dán link sau vào trình duyệt:</p>
          <p style="word-break: break-all; color: #1d4ed8;">${verifyLink}</p>
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #facc15;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Lưu ý:</strong> Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email hoặc liên hệ với bộ phận hỗ trợ để được trợ giúp.
            </p>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">Link xác nhận sẽ hết hạn sau 24 giờ.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f3f4f6; border-radius: 5px;">
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            Email này được gửi tự động. Vui lòng không trả lời email này.
          </p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: newEmail,
    subject: `Xác nhận thay đổi email - ${getBrandName()}`,
    html,
  })
}

