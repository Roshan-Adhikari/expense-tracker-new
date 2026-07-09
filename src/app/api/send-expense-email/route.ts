import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY || "temp");

export async function POST(request: Request) {
  try {
    const { friendEmail, friendName, userName, amount, description, groupName, splitAmount } = await request.json();
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured. Simulating email send.");
      return NextResponse.json({ success: true, simulated: true });
    }

    const { data, error } = await resend.emails.send({
      from: `Expense Tracker <${fromEmail}>`,
      to: [friendEmail],
      subject: `New Shared Expense: ${description}`,
      html: `
        <div style="font-family: sans-serif; background-color: #05050A; color: #F8F9FA; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.05);">
          <h2 style="color: #7C3AED; margin-bottom: 20px;">Shared Expense Notification</h2>
          <p>Hey ${friendName},</p>
          <p><strong>${userName}</strong> just added a new expense in the group <strong>${groupName}</strong>.</p>
          
          <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin: 25px 0;">
            <table style="width: 100%; text-align: left;">
              <tr>
                <td style="color: #9CA3AF; padding-bottom: 8px;">Description:</td>
                <td style="font-weight: bold; color: #F8F9FA; padding-bottom: 8px;">${description}</td>
              </tr>
              <tr>
                <td style="color: #9CA3AF; padding-bottom: 8px;">Total Amount:</td>
                <td style="font-weight: bold; color: #F8F9FA; padding-bottom: 8px;">₹${Number(amount).toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                <td style="color: #7C3AED; font-weight: bold; padding-top: 12px;">Your Share:</td>
                <td style="color: #7C3AED; font-weight: bold; font-size: 18px; padding-top: 12px;">₹${Number(splitAmount).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View Dashboard</a>
          </div>
          
          <p style="color: #9CA3AF; font-size: 11px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; text-align: center;">
            This is an automated notification from Expense Tracker App.
          </p>
        </div>
      `
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
