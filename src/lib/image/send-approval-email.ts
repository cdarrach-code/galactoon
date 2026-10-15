/** Destination for "Approve final design" emails. */
export const APPROVAL_EMAIL = "cdarrach@gmail.com";

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";
  return new File(
    [blob],
    `galactic-toon-approved.${extensionForMime(mimeType)}`,
    { type: mimeType },
  );
}

/**
 * Browser FormSubmit path — works from the user's browser where Cloudflare
 * bot checks pass. First-time use may require confirming the inbox once.
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
