import { NextRequest, NextResponse } from "next/server";
import { generateCharacter } from "@/lib/image/generation-service";
import { parseCustomization } from "@/lib/style/customization-schema";

// Ask the platform for the longest available synchronous window.
export const maxDuration = 60;

/**
 * Stream JSON with periodic whitespace keepalives so Netlify's ~30s
 * inactivity timeout does not kill long OpenAI image edits.
 * Clients that JSON.parse the full body still work (leading whitespace is valid).
 */
function jsonWithKeepalive(
  work: () => Promise<unknown>,
  errorStatus = 500,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 10000);

      void (async () => {
        try {
          const payload = await work();
          controller.enqueue(encoder.encode(JSON.stringify(payload)));
        } catch (err) {
          console.error("[generate]", err);
          const message = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                error: "Character generation failed.",
                details: message,
              }),
            ),
          );
          // Status codes can't change mid-stream; body carries the error.
          void errorStatus;
        } finally {
          clearInterval(keepalive);
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const photo = form.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json(
        { error: "A photograph upload is required." },
        { status: 400 },
      );
    }

    if (photo.size === 0) {
      return NextResponse.json(
        { error: "Uploaded photograph is empty." },
        { status: 400 },
      );
    }

    // Soft guard against oversized uploads that can crash serverless handlers.
    if (photo.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "Photo too large.",
          details:
            "That photo is too large. Try Upload photo with a smaller JPG, or take another selfie.",
        },
        { status: 413 },
      );
    }

    let customization;
    try {
      customization = parseCustomization(form.get("customization"));
    } catch (err) {
      return NextResponse.json(
        {
          error: "Invalid customization settings.",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await photo.arrayBuffer());
    const forceMock = form.get("forceMock") === "true";

    return jsonWithKeepalive(async () => {
      const result = await generateCharacter({
        photoBytes: bytes,
        photoFilename: photo.name || "photo.jpg",
        photoMimeType: photo.type || "image/jpeg",
        customization,
        forceMock,
      });

      return {
        image: `data:${result.mimeType};base64,${result.imageBase64}`,
        metadata: result.metadata,
        prompt: {
          styleVersion: result.metadata.styleVersion,
          fixedStyleIncluded: true,
          variableCharacterInstructions:
            result.prompt.variableCharacterInstructions,
        },
      };
    });
  } catch (err) {
    console.error("[generate]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Character generation failed.",
        details: message,
      },
      { status: 500 },
    );
  }
}
