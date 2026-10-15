/** Destination for "Approve final design" emails. */
export const APPROVAL_EMAIL = "cdarrach@gmail.com";

export const DESIGN_APPROVAL_FORM_NAME = "design-approval";

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export async function dataUrlToFile(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";
  return new File(
    [blob],
    `galactic-toon-approved.${extensionForMime(mimeType)}`,
    { type: mimeType },
  );
}

export function buildApprovalFormData(options: {
  file: Blob;
  filename: string;
  metadata?: {
    styleVersion?: string;
    customization?: unknown;
  } | null;
}): FormData {
  const customization = options.metadata?.customization ?? {};
  const styleVersion = options.metadata?.styleVersion ?? "unknown";
  const form = new FormData();
  form.append("form-name", DESIGN_APPROVAL_FORM_NAME);
  form.append(
    "message",
    [
      "A final character design was approved in Galactic Toon Studio.",
      `Sent to: ${APPROVAL_EMAIL}`,
      `Style version: ${String(styleVersion)}`,
      `Customization: ${JSON.stringify(customization)}`,
      "Open the attachment link in this email to download the approved image.",
    ].join("\n"),
  );
  form.append("styleVersion", String(styleVersion));
  form.append("customization", JSON.stringify(customization));
  form.append("attachment", options.file, options.filename);
  return form;
}

/**
 * Production path: Netlify Forms → site email hook → Gmail.
 * Posts to the static form page so the Netlify forms handler receives it
 * even when the Next.js app owns `/`.
 */
export async function sendApprovalViaNetlifyForms(options: {
  imageDataUrl: string;
  metadata?: {
    styleVersion?: string;
    customization?: unknown;
  } | null;
  endpoint?: string;
}): Promise<{ emailedTo: string; provider: "netlify-forms" }> {
  const file = await dataUrlToFile(options.imageDataUrl);
  const form = buildApprovalFormData({
    file,
    filename: file.name,
    metadata: options.metadata,
  });

  const endpoint = options.endpoint || "/__forms.html";
  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  // Netlify returns 200 HTML on success. Next.js local may 404/405.
  if (!response.ok) {
    throw new Error(
      `Netlify form submission failed (${response.status}).`,
    );
  }

  return { emailedTo: APPROVAL_EMAIL, provider: "netlify-forms" };
}

/**
 * Browser FormSubmit fallback (local/dev). May require one inbox confirmation.
 */
export async function sendApprovalViaFormSubmit(options: {
  imageDataUrl: string;
  metadata?: {
    styleVersion?: string;
    customization?: unknown;
  } | null;
}): Promise<{ emailedTo: string; provider: "formsubmit" }> {
  const file = await dataUrlToFile(options.imageDataUrl);
  const customization = options.metadata?.customization ?? {};
  const styleVersion = options.metadata?.styleVersion ?? "unknown";

  const form = new FormData();
  form.append("_subject", "Approved Galactic Toon Studio design");
  form.append("_captcha", "false");
  form.append("_template", "box");
  form.append("name", "Galactic Toon Studio");
  form.append(
    "message",
    [
      "A final character design was approved in Galactic Toon Studio.",
      `Style version: ${String(styleVersion)}`,
      `Customization: ${JSON.stringify(customization)}`,
      "The approved image is attached.",
    ].join("\n"),
  );
  form.append("attachment", file, file.name);

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(APPROVAL_EMAIL)}`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    success?: string | boolean;
    message?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Could not email design (${response.status}).`,
    );
  }

  return { emailedTo: APPROVAL_EMAIL, provider: "formsubmit" };
}

export async function sendApprovalEmail(options: {
  imageDataUrl: string;
  metadata?: {
    styleVersion?: string;
    customization?: unknown;
  } | null;
}): Promise<{ emailedTo: string; provider: string }> {
  try {
    return await sendApprovalViaNetlifyForms(options);
  } catch {
    return sendApprovalViaFormSubmit(options);
  }
}
