import nodemailer from "nodemailer";

export class EmailService {
  private getTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Sends a welcome email when a user registers.
   * Fails gracefully without throwing so registration never breaks.
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    role: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn(
        "[EmailService] ⚠️ GMAIL_USER or GMAIL_APP_PASSWORD not set. Skipping welcome email."
      );
      return false;
    }

    const roleName = role === "recruiter" ? "Recruiter" : "Job Seeker";
    const welcomeMessage =
      role === "recruiter"
        ? "You can now post job openings, track applicants, and leverage AI risk scoring to hire top candidates faster."
        : "You can now search top job listings, apply with your resume, and get instant AI-powered compatibility scores.";

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">TalentCompass</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Smart AI Job Portal</p>
        </div>

        <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">Welcome, ${name}! 🎉</h2>
        <p style="font-size: 15px; color: #374151; line-height: 1.6;">
          Thank you for joining TalentCompass as a <strong>${roleName}</strong>.
        </p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
          ${welcomeMessage}
        </p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.APP_URL || "http://localhost:5173"}" 
             style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Get Started
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          If you did not create an account with TalentCompass, you can safely ignore this email.
        </p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: `"TalentCompass" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Welcome to TalentCompass, ${name}! 🎉`,
        text: `Welcome to TalentCompass, ${name}! You signed up as a ${roleName}.\n\n${welcomeMessage}\n\nGet started: ${process.env.APP_URL || "http://localhost:5173"}`,
        html: htmlContent,
      });

      console.log(`[EmailService] ✅ Welcome email sent successfully to ${to}`);
      return true;
    } catch (err: any) {
      console.error("[EmailService] ❌ Failed to send welcome email:", err.message);
      return false;
    }
  }
}

export const emailService = new EmailService();
