import { NextRequest, NextResponse } from "next/server";
import { generateCharacter } from "@/lib/image/generation-service";
import { parseCustomization } from "@/lib/style/customization-schema";

// Ask the platform for the longest available synchronous window.
export const maxDuration = 60;

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

    const result = await generateCharacter({
      photoBytes: bytes,
      photoFilename: photo.name || "photo.jpg",
      photoMimeType: photo.type || "image/jpeg",
      customization,
      forceMock,
    });

    return NextResponse.json({
      image: `data:${result.mimeType};base64,${result.imageBase64}`,
      metadata: result.metadata,
      prompt: {
        styleVersion: result.metadata.styleVersion,
        fixedStyleIncluded: true,
        variableCharacterInstructions:
          result.prompt.variableCharacterInstructions,
      },
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
