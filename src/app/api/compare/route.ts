import { NextRequest, NextResponse } from "next/server";
import { readAdminConfig } from "@/lib/image/admin-config";
import { generateStyleComparison } from "@/lib/image/generation-service";
import { parseCustomization } from "@/lib/style/customization-schema";

function assertDeveloperAccess(request: NextRequest): NextResponse | null {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    // Local/dev: gated by config flag only.
    return null;
  }
  if (request.headers.get("x-admin-token") !== token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

/**
 * Developer-only comparison mode: generate multiple characters with the
 * same locked classic2d-v1 profile to inspect style consistency.
 */
export async function POST(request: NextRequest) {
  const denied = assertDeveloperAccess(request);
  if (denied) return denied;

  const config = await readAdminConfig();
  if (!config.developerComparisonMode && process.env.DEV_COMPARISON_MODE !== "true") {
    return NextResponse.json(
      {
        error:
          "Developer comparison mode is disabled. Enable it via admin config or DEV_COMPARISON_MODE=true.",
      },
      { status: 403 },
    );
  }

  try {
    const form = await request.formData();
    const photos = form.getAll("photos").filter((v): v is File => v instanceof File);

    if (photos.length < 2) {
      return NextResponse.json(
        { error: "Upload at least two photographs to compare style consistency." },
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

    const forceMock = form.get("forceMock") === "true";
    const comparison = await generateStyleComparison({
      subjects: await Promise.all(
        photos.map(async (photo, index) => ({
          label: photo.name || `Person ${String.fromCharCode(65 + index)}`,
          photoBytes: Buffer.from(await photo.arrayBuffer()),
          photoFilename: photo.name,
          photoMimeType: photo.type || "image/png",
        })),
      ),
      customization,
      forceMock,
    });

    return NextResponse.json({
      sharedStyleVersion: comparison.sharedStyleVersion,
      sharedModel: comparison.sharedModel,
      results: comparison.results.map((r) => ({
        label: r.label,
        image: `data:${r.mimeType};base64,${r.imageBase64}`,
        metadata: r.metadata,
      })),
    });
  } catch (err) {
    console.error("[compare]", err);
    return NextResponse.json(
      {
        error: "Comparison generation failed.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
