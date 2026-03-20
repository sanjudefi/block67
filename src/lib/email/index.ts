// Email sending via Resend HTTP API
// Uses fetch directly — no npm package needed

const FROM = "no-reply@block67.app";
const ADMIN_EMAIL = "sanju.m@catchway.com";
const RESEND_URL = "https://api.resend.com/emails";

async function send(to: string | string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
    }
  } catch (err) {
    console.error("[email] fetch error:", err);
  }
}

// ── Public helpers ─────────────────────────────────────────────────────────────

/** Sent on email/password signup — includes verification link */
export async function sendVerificationEmail(email: string, name: string | null, token: string) {
  const url = `${process.env.NEXTAUTH_URL ?? "https://block67.app"}/api/auth/verify-email?token=${token}`;
  await send(email, "Verify your block67 email", `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;color:#1a1a2e">
        Welcome to block67${name ? `, ${name}` : ""}! 👋
      </h1>
      <p style="color:#555;margin-bottom:24px">
        You're one step away from launching your first Web3 project.
        Click the button below to verify your email address.
      </p>
      <a href="${url}"
        style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        Verify Email →
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">
        This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#bbb;font-size:11px">block67.app · Build & deploy blockchain apps in minutes</p>
    </div>
  `);
}

/** Sent after successful contract deployment */
export async function sendDeploymentSuccessEmail(
  email: string,
  name: string | null,
  projectName: string,
  contractAddress: string,
  chainName: string,
  explorerUrl: string,
) {
  await send(email, `🚀 ${projectName} deployed on ${chainName}`, `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
        <div style="font-size:40px;margin-bottom:8px">🚀</div>
        <h1 style="color:#fff;font-size:20px;margin:0">Contract Deployed Successfully!</h1>
      </div>
      <p style="color:#333;font-size:15px">
        Hi ${name ?? "there"},<br><br>
        Your project <strong>${projectName}</strong> has been deployed on <strong>${chainName}</strong>.
      </p>
      <div style="background:#f8f8ff;border:1px solid #e0e0ff;border-radius:12px;padding:16px;margin:20px 0">
        <p style="color:#666;font-size:11px;margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Contract Address</p>
        <code style="font-size:13px;color:#1a1a2e;word-break:break-all">${contractAddress}</code>
      </div>
      <a href="${explorerUrl}/address/${contractAddress}" target="_blank"
        style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none;font-size:14px;margin-bottom:16px">
        View on Explorer →
      </a>
      <p style="color:#555;font-size:14px">
        Your contract is now live and immutable on-chain. Head to your
        <a href="${process.env.NEXTAUTH_URL ?? "https://block67.app"}/dashboard" style="color:#4f46e5">dashboard</a>
        to customize the frontend and connect a custom domain.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#bbb;font-size:11px">block67.app · Build & deploy blockchain apps in minutes</p>
    </div>
  `);
}

/** Admin notification for new user signup */
export async function notifyAdminNewUser(email: string | null, walletAddress: string | null, name: string | null) {
  await send(ADMIN_EMAIL, "🆕 New user signed up — block67", `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:12px;color:#1a1a2e">New User Registration</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="color:#888;padding:6px 0;width:120px">Name:</td><td style="color:#333">${name ?? "—"}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Email:</td><td style="color:#333">${email ?? "—"}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Wallet:</td><td style="color:#333;font-family:monospace;font-size:12px">${walletAddress ?? "—"}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Time:</td><td style="color:#333">${new Date().toUTCString()}</td></tr>
      </table>
      <a href="${process.env.NEXTAUTH_URL ?? "https://block67.app"}/admin/users"
        style="display:inline-block;margin-top:16px;background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
        View in Admin →
      </a>
    </div>
  `);
}

/** Admin notification for new feedback */
export async function notifyAdminFeedback(feedbackId: string, name: string, email: string, message: string, rating?: number | null) {
  await send(ADMIN_EMAIL, `💬 New Feedback from ${name} — block67`, `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:12px;color:#1a1a2e">New Feedback Submitted</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="color:#888;padding:6px 0;width:80px">From:</td><td style="color:#333">${name} &lt;${email}&gt;</td></tr>
        ${rating ? `<tr><td style="color:#888;padding:6px 0">Rating:</td><td style="color:#f59e0b">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</td></tr>` : ""}
      </table>
      <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:14px;margin:14px 0">
        <p style="margin:0;color:#333;font-size:14px;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL ?? "https://block67.app"}/admin/feedback"
        style="display:inline-block;background:#1a1a2e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
        View in Admin →
      </a>
    </div>
  `);
}

/** Admin notification for new custom web3 inquiry */
export async function notifyAdminLead(lead: {
  name: string; email: string; projectType: string;
  description: string; budget?: string | null; timeline?: string | null;
}) {
  await send(ADMIN_EMAIL, `🔥 New Custom Build Inquiry — ${lead.name}`, `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:12px;color:#1a1a2e">New Custom Web3 Build Request</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="color:#888;padding:6px 0;width:110px">Name:</td><td style="color:#333">${lead.name}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Email:</td><td style="color:#333">${lead.email}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Project:</td><td style="color:#4f46e5;font-weight:700">${lead.projectType}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Budget:</td><td style="color:#333">${lead.budget ?? "Not specified"}</td></tr>
        <tr><td style="color:#888;padding:6px 0">Timeline:</td><td style="color:#333">${lead.timeline ?? "Not specified"}</td></tr>
      </table>
      <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:14px;margin:14px 0">
        <p style="color:#666;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px">What they want to build:</p>
        <p style="margin:0;color:#333;font-size:14px;line-height:1.6">${lead.description.replace(/\n/g, "<br>")}</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL ?? "https://block67.app"}/admin/leads"
        style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
        View in Admin →
      </a>
    </div>
  `);
}
