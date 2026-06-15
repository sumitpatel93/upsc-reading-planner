import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendSignupNotification(name: string, email: string) {
  try {
    await resend.emails.send({
      from: 'UPSC Planner <onboarding@resend.dev>',
      to: 'sumit.patel93@gmail.com',
      subject: 'New signup on UPSC Planner',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
          <div style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:20px;border-radius:10px;margin-bottom:20px;text-align:center">
            <h1 style="color:white;margin:0;font-size:22px">New User Signed Up!</h1>
          </div>
          <div style="background:white;padding:20px;border-radius:10px;border:1px solid #e2e8f0">
            <p style="margin:0 0 12px;font-size:14px;color:#64748b">A new user just joined UPSC Reading Planner:</p>
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#94a3b8;width:80px">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:#0f172a">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#94a3b8">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:#2563eb">${email}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#94a3b8">Time</td>
                <td style="padding:10px 0;font-size:14px;color:#475569">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
              </tr>
            </table>
          </div>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center">
            UPSC Reading Planner
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Signup notification failed:', err)
  }
}
