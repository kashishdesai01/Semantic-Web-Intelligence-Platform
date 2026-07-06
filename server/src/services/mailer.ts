import sgMail from "@sendgrid/mail";

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendResetEmail(to: string, resetUrl: string) {
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not set");
  }
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!from) {
    throw new Error("SENDGRID_FROM_EMAIL is not set");
  }

  try {
    const [resp] = await sgMail.send({
      to,
      from,
      subject: "Reset your Semantic Web Intelligence Platform password",
      text: `Reset your password using this link: ${resetUrl}`,
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
    const msgId = resp?.headers?.["x-message-id"];
    console.log("SendGrid status:", resp?.statusCode, "message-id:", msgId, "to:", to, "from:", from);
  } catch (err: any) {
    const response = err?.response;
    const body = response?.body;
    console.error("SendGrid error:", response?.statusCode, body || err?.message || err);
    throw err;
  }
}
