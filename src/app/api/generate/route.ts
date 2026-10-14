import { NextRequest, NextResponse } from "next/server";
import { generateCharacter } from "@/lib/image/generation-service";
import { parseCustomization } from "@/lib/style/customization-schema";

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
      photoFilename: photo.name || "photo.png",
      photoMimeType: photo.type || "image/png",
      customization,
      forceMock,
    });

    return NextResponse.json({
      image: `data:${result.mimeType};base64,${result.imageBase64}`,
      metadata: result.metadata,
      prompt: {
        // Expose structure for debugging / verification; fixed block is immutable.
        styleVersion: result.metadata.styleVersion,
        fixedStyleIncluded: true,
        variableCharacterInstructions:
          result.prompt.variableCharacterInstructions,
      },
    });
  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json(
      {
        error: "Character generation failed.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
