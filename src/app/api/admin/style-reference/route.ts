import { NextRequest, NextResponse } from "next/server";
import {
  readAdminConfig,
  writeAdminConfig,
} from "@/lib/image/admin-config";
import {
  loadMasterStyleReference,
  replaceMasterStyleReference,
} from "@/lib/image/master-reference";

function assertAdmin(request: NextRequest): NextResponse | null {
  const configured = process.env.ADMIN_API_TOKEN;
  // In local/dev without a token, allow access but never expose this to end users in UI.
  if (!configured) {
    return null;
  }
  const header = request.headers.get("x-admin-token");
  if (header !== configured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

/** Inspect current master reference (admin/developer only). */
export async function GET(request: NextRequest) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const config = await readAdminConfig();
  const master = await loadMasterStyleReference();

  return NextResponse.json({
    config,
    master: {
      filename: master.filename,
      styleVersion: master.styleVersion,
      referenceId: master.referenceId,
      source: master.source,
      absolutePath: master.absolutePath,
      byteLength: master.bytes.length,
      previewUrl: "/style-references/classic-2d-master.png",
    },
  });
}

/**
 * Replace the permanent master style reference without changing application code.
 * Regular users must not call this endpoint.
 */
export async function POST(request: NextRequest) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  try {
    const form = await request.formData();
    const file = form.get("reference");
    const comparisonMode = form.get("developerComparisonMode");

    if (comparisonMode === "true" || comparisonMode === "false") {
      await writeAdminConfig(
        { developerComparisonMode: comparisonMode === "true" },
        "admin",
      );
    }

    if (file instanceof File && file.size > 0) {
      if (!file.type.includes("png") && !file.name.toLowerCase().endsWith(".png")) {
        return NextResponse.json(
          { error: "Master reference must be a PNG image." },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const master = await replaceMasterStyleReference(bytes, "admin");
      const config = await readAdminConfig();
      return NextResponse.json({
        ok: true,
        config,
        master: {
          filename: master.filename,
          styleVersion: master.styleVersion,
          referenceId: master.referenceId,
          source: master.source,
          byteLength: master.bytes.length,
          previewUrl: `/style-references/classic-2d-master.png?t=${Date.now()}`,
        },
      });
    }

    const config = await readAdminConfig();
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[admin/style-reference]", err);
    return NextResponse.json(
      {
        error: "Failed to update master style reference.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
