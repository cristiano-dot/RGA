// Minimal email sending via the Resend HTTP API (https://resend.com) — no
// SDK dependency, just fetch. Falls back to logging the message to the
// server console when RESEND_API_KEY isn't set, so the app (and every flow
// that sends mail: RGA decisions, admin comments, password resets) keeps
// working in local/demo use without an email provider configured.

const RESEND_API_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "RGA Portal <onboarding@resend.dev>";
}

export type SendEmailResult = { sent: boolean; error?: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log(
      `[email:not-configured] Would send to ${params.to}\nSubject: ${params.subject}\n\n${params.text}\n`
    );
    return { sent: false, error: "Email not configured (RESEND_API_KEY unset)." };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email:failed] ${res.status} sending to ${params.to}: ${body}`);
      return { sent: false, error: `Resend API error: ${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error(`[email:failed] sending to ${params.to}`, err);
    return { sent: false, error: (err as Error).message };
  }
}
