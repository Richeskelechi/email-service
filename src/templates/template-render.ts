export type TemplateVariables = Record<string, string | number | boolean | null | undefined>;

export type RenderedTemplate = {
  subject: string;
  text?: string;
  html?: string;
};

/** Replace {{var}} placeholders. Missing keys become empty string. */
export function renderTemplateString(
  template: string,
  variables: TemplateVariables,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

export function renderTemplateContent(
  template: {
    subject: string;
    textBody: string | null;
    htmlBody: string | null;
  },
  variables: TemplateVariables,
): RenderedTemplate {
  const subject = renderTemplateString(template.subject, variables);
  const text = template.textBody
    ? renderTemplateString(template.textBody, variables)
    : undefined;
  const html = template.htmlBody
    ? renderTemplateString(template.htmlBody, variables)
    : undefined;

  return { subject, text, html };
}
