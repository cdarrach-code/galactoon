import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const APPROVAL_EMAIL =
  process.env.APPROVAL_EMAIL?.trim() || "cdarrach@gmail.com";

function parseDataUrl(dataUrl: string): {
  mimeType: string;
  base64: string;
  extension: string;
} {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid image payload.");
  }
  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";
  return { mimeType, base64, extension };
}

async function sendWithResend(options: {
  subject: string;
  html: string;
  text: string;
  filename: string;
  mimeType: string;
  base64: string;
}): Promise<{ ok: true; provider: "resend" } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Galactic Toon Studio <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [APPROVAL_EMAIL],
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: [
        {
          filename: options.filename,
          content: options.base64,
          content_type: options.mimeType,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      error: `Resend failed (${response.status}): ${body.slice(0, 300)}`,
    };
  }

  return { ok: true, provider: "resend" };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      image?: string;
      metadata?: Record<string, unknown>;
      note?: string;
    };

    if (!body.image || typeof body.image !== "string") {
      return NextResponse.json(
        { error: "Approved image is required." },
        { status: 400 },
      );
    }

    // Server-side FormSubmit is blocked by Cloudflare from hosting IPs.
    // Without Resend, the client falls back to browser FormSubmit.
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          fallback: "client",
          emailedTo: APPROVAL_EMAIL,
          error: "Server mailer not configured; use client fallback.",
        },
        { status: 501 },
      );
    }

    const { mimeType, base64, extension } = parseDataUrl(body.image);
    const subject = "Approved Galactic Toon Studio design";
    const customization = body.metadata?.customization ?? {};
    const styleVersion = body.metadata?.styleVersion ?? "unknown";
    const text = [
      "A final character design was approved in Galactic Toon Studio.",
      "",
      `Sent to: ${APPROVAL_EMAIL}`,
      `Style version: ${String(styleVersion)}`,
      `Customization: ${JSON.stringify(customization)}`,
      body.note ? `Note: ${body.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <h2>Approved Galactic Toon design</h2>
      <p>A final character design was approved in Galactic Toon Studio.</p>
      <ul>
        <li><strong>Sent to:</strong> ${APPROVAL_EMAIL}</li>
        <li><strong>Style version:</strong> ${String(styleVersion)}</li>
        <li><strong>Customization:</strong> <code>${JSON.stringify(customization)}</code></li>
      </ul>
      ${body.note ? `<p><strong>Note:</strong> ${body.note}</p>` : ""}
      <p>The approved image is attached.</p>
    `;

    const filename = `galactic-toon-approved.${extension}`;
    const result = await sendWithResend({
      subject,
      html,
      text,
      filename,
      mimeType,
      base64,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          fallback: "client",
          emailedTo: APPROVAL_EMAIL,
          error: "Could not send approval email.",
          details: result.error,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      emailedTo: APPROVAL_EMAIL,
      provider: result.provider,
    });
  } catch (err) {
    console.error("[approve]", err);
    return NextResponse.json(
      {
        ok: false,
        fallback: "client",
        emailedTo: APPROVAL_EMAIL,
        error: "Approval email failed.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
