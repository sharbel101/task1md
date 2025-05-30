// sendEmail.ts
export async function sendEmail(to: string, subject: string, htmlBody: string) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, htmlBody }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    const result = await response.json();
    console.log("✅ Email sent!", result);
    return result;
  } catch (error: any) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}
