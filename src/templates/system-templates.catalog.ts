export const SYSTEM_TEMPLATE_KEYS = {
  /** First user when an organization is created */
  SET_PASSWORD: "auth.set_password",
  /** Existing member invites someone into the org */
  INVITE_USER: "auth.invite_user",
  RESET_PASSWORD: "auth.reset_password",
} as const;

export type SystemTemplateKey =
  (typeof SYSTEM_TEMPLATE_KEYS)[keyof typeof SYSTEM_TEMPLATE_KEYS];

export type SystemTemplateDefinition = {
  key: SystemTemplateKey;
  name: string;
  subject: string;
  textBody: string;
  htmlBody: string;
};

type AuthEmailCopy = {
  preheader: string;
  eyebrow: string;
  title: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  expiryNote: string;
  footerNote: string;
};

function authEmailHtml(copy: AuthEmailCopy): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${copy.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f1ec;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${copy.preheader}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f1ec;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e6e2d9;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #eeeae2;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:#1c1917;letter-spacing:-0.02em;">
                my-email
              </p>
              <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.4;color:#78716c;text-transform:uppercase;letter-spacing:0.08em;">
                ${copy.eyebrow}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#1c1917;font-weight:normal;">
                ${copy.title}
              </h1>
              <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#44403c;">
                ${copy.greeting}
              </p>
              <p style="margin:0 0 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#44403c;">
                ${copy.body}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" bgcolor="#0f766e" style="border-radius:8px;">
                    <a href="{{actionUrl}}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">
                      ${copy.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#78716c;">
                ${copy.expiryNote}
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#a8a29e;">
                Button not working? Paste this link into your browser:<br />
                <a href="{{actionUrl}}" style="color:#0f766e;word-break:break-all;text-decoration:underline;">{{actionUrl}}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background-color:#fafaf8;border-top:1px solid #eeeae2;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#a8a29e;">
                ${copy.footerNote}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;color:#a8a29e;">
          Sent by my-email · {{organizationName}}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export const SYSTEM_TEMPLATES_CATALOG: SystemTemplateDefinition[] = [
  {
    key: SYSTEM_TEMPLATE_KEYS.SET_PASSWORD,
    name: "Welcome (organization owner)",
    subject: "Set your password for {{organizationName}}",
    textBody: [
      "Hi {{name}},",
      "",
      "Your organization {{organizationName}} is ready on my-email.",
      "Set your password to sign in as the account owner:",
      "",
      "{{actionUrl}}",
      "",
      "This link expires in {{expiresHours}} hours.",
      "",
      "If you did not create this organization, you can ignore this email.",
      "",
      "— my-email",
    ].join("\n"),
    htmlBody: authEmailHtml({
      preheader:
        "Your {{organizationName}} organization is ready — set your owner password.",
      eyebrow: "Organization created",
      title: "Your organization is ready",
      greeting: "Hi {{name}},",
      body: 'Your organization <strong style="color:#1c1917;">{{organizationName}}</strong> has been created on my-email. Set a password to sign in as the owner and invite your team.',
      ctaLabel: "Set your password",
      expiryNote: "This secure link expires in {{expiresHours}} hours.",
      footerNote:
        "If you did not create this organization, you can safely ignore this email.",
    }),
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.INVITE_USER,
    name: "Organization invite",
    subject: "{{inviterName}} invited you to {{organizationName}}",
    textBody: [
      "Hi {{name}},",
      "",
      "{{inviterName}} ({{inviterEmail}}) invited you to join {{organizationName}} on my-email.",
      "Set your password to accept the invite and sign in:",
      "",
      "{{actionUrl}}",
      "",
      "This link expires in {{expiresHours}} hours.",
      "",
      "If you were not expecting this invitation, you can ignore this email.",
      "",
      "— my-email",
    ].join("\n"),
    htmlBody: authEmailHtml({
      preheader:
        "{{inviterName}} invited you to {{organizationName}} — set your password to join.",
      eyebrow: "Team invitation",
      title: "You’ve been invited",
      greeting: "Hi {{name}},",
      body: '<strong style="color:#1c1917;">{{inviterName}}</strong> (<a href="mailto:{{inviterEmail}}" style="color:#0f766e;text-decoration:none;">{{inviterEmail}}</a>) invited you to join <strong style="color:#1c1917;">{{organizationName}}</strong> on my-email. Set a password to accept the invite and get started.',
      ctaLabel: "Accept invite &amp; set password",
      expiryNote: "This invitation link expires in {{expiresHours}} hours.",
      footerNote:
        "If you were not expecting this invitation, you can safely ignore this email. No account access is possible until you set a password.",
    }),
  },
  {
    key: SYSTEM_TEMPLATE_KEYS.RESET_PASSWORD,
    name: "Reset password",
    subject: "Reset your password for {{organizationName}}",
    textBody: [
      "Hi {{name}},",
      "",
      "We received a request to reset your password for {{organizationName}}.",
      "Use this link to choose a new password:",
      "",
      "{{actionUrl}}",
      "",
      "This link expires in {{expiresHours}} hours.",
      "",
      "If you did not request a reset, you can ignore this email — your password will stay the same.",
      "",
      "— my-email",
    ].join("\n"),
    htmlBody: authEmailHtml({
      preheader:
        "Reset your {{organizationName}} password using the secure link inside.",
      eyebrow: "Password reset",
      title: "Reset your password",
      greeting: "Hi {{name}},",
      body: 'We received a request to reset the password for your <strong style="color:#1c1917;">{{organizationName}}</strong> account. Use the button below to choose a new one.',
      ctaLabel: "Reset password",
      expiryNote: "This secure link expires in {{expiresHours}} hours.",
      footerNote:
        "If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.",
    }),
  },
];
