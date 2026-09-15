import { findUserById } from "./users";
import { sendEmail } from "./email";

// Best-effort email alongside the in-app notification row. Failures are
// logged (see lib/email.ts) but never thrown — a bad email shouldn't roll
// back or block the underlying action (approval, comment, etc.).
export async function emailUser(userId: number, subject: string, text: string) {
  const user = findUserById(userId);
  if (!user) return;

  await sendEmail({
    to: user.email,
    subject,
    text,
    html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
  });
}
