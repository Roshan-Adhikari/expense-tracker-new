import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY || "temp");

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured. Simulating email send.");
      return NextResponse.json({ success: true, simulated: true });
    }

    const { data, error } = await resend.emails.send({
      from: `Expense Tracker <${fromEmail}>`,
      to: [email],
      subject: "You've been invited to Expense Tracker App!",
      html: `
        <div style="font-family: sans-serif; background-color: #05050A; color: #F8F9FA; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.05);">
          <h2 style="color: #7C3AED; margin-bottom: 20px;">Expense Tracker App</h2>
          <p>Hello,</p>
          <p>Your friend has invited you to join <strong>Expense Tracker App</strong>, the futuristic way to manage and split costs with friends.</p>
          <p>To accept this invitation and start splitting expenses, create an account using this email address by clicking the link below:</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Get Started</a>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
            If you did not expect this email, you can safely ignore it.
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
