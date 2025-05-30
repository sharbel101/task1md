import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Initialize Resend with your API key
const resend = new Resend('re_3NAzFn5E_6vWA2JCqWkdU4a3cJwF1Dv1x'); // Replace with your actual Resend API key

export async function POST(request: Request) {
  try {
    const { to, subject, htmlBody } = await request.json();

    if (!to || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // This is a default sender that works for testing
      to: to,
      subject: subject,
      html: htmlBody,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
} 