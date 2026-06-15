import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendSignupNotification(name: string, email: string) {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['sumit.patel93@gmail.com'],
      subject: 'New signup — UPSC Planner: ' + name,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4ed8">New User Signed Up!</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr>
              <td style="padding:8px 0;color:#64748b;width:60px">Name</td>
              <td style="padding:8px 0;font-weight:700">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b">Email</td>
              <td style="padding:8px 0;font-weight:700;color:#2563eb">${email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b">Time</td>
              <td style="padding:8px 0">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
            </tr>
          </table>
          <p style="margin-top:16px;font-size:12px;color:#94a3b8">upsc-reading-planner.vercel.app</p>
        </div>
      `,
    })
    console.log('Signup email result:', JSON.stringify(result))
  } catch (err) {
    console.error('Signup notification failed:', JSON.stringify(err))
  }
}
