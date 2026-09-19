export async function sendAuditCompleteEmail(
  apiKey: string | undefined,
  senderEmail: string | undefined,
  toEmail: string,
  auditId: string,
  score: number,
  issueCount: number,
): Promise<void> {
  if (!apiKey || !senderEmail) return;
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: 'SKUcoverage' },
        to: [{ email: toEmail }],
        subject: `Your SKUcoverage audit is ready (score: ${score}%)`,
        htmlContent: `<h2 style="color:#12304a">Your catalog audit is complete</h2><p>Health score: <strong>${score}%</strong></p><p>Issues found: <strong>${issueCount}</strong></p><p><a href="https://skucoverage.tech/app/">View your dashboard</a></p><p style="color:#667085;font-size:12px">Audit ${auditId}</p>`,
      }),
    });
    if (!response.ok) console.error('Brevo email failed', response.status, await response.text());
  } catch (error) {
    console.error('Brevo email error', error);
  }
}
