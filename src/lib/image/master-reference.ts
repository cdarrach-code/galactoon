import { promises as fs } from "fs";
import path from "path";
import { Classic2DStyleProfile } from "@/lib/style/classic-2d-style-profile";
import {
  getDefaultReferencePath,
  getOverrideReferencePath,
  readAdminConfig,
  resolveReferencePath,
} from "./admin-config";

export interface MasterReferenceAsset {
  absolutePath: string;
  filename: string;
  bytes: Buffer;
  mimeType: "image/png";
  styleVersion: string;
  /** Stable id for metadata — hash of path + mtime + size. */
  referenceId: string;
  source: "default" | "override" | "configured";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getPublicReferencePath(): string {
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "public",
    "style-references",
    Classic2DStyleProfile.masterReferenceFilename,
  );
}

/**
 * Resolves the permanent master style reference for every generation.
 * Regular users cannot change this; admins replace via config/upload.
 * Falls back to public/ for serverless hosts (Netlify) where assets/ may
 * not be present in the function bundle.
 */
export async function loadMasterStyleReference(): Promise<MasterReferenceAsset> {
  const config = await readAdminConfig();
  const configured = resolveReferencePath(config.masterReferencePath);
  const override = getOverrideReferencePath();
  const fallback = getDefaultReferencePath();
  const publicFallback = getPublicReferencePath();

  let absolutePath = configured;
  let source: MasterReferenceAsset["source"] = "configured";

  if (!(await fileExists(absolutePath))) {
    if (await fileExists(override)) {
      absolutePath = override;
      source = "override";
    } else if (await fileExists(fallback)) {
      absolutePath = fallback;
      source = "default";
    } else if (await fileExists(publicFallback)) {
      absolutePath = publicFallback;
      source = "default";
    } else {
      throw new Error(
        `Master style reference not found. Expected ${Classic2DStyleProfile.masterReferenceFilename} at ${fallback}`,
      );
    }
  } else if (absolutePath === override) {
    source = "override";
  } else if (absolutePath === fallback || absolutePath === publicFallback) {
    source = "default";
  }

  const bytes = await fs.readFile(absolutePath);
  const stat = await fs.stat(absolutePath);
  const referenceId = [
    Classic2DStyleProfile.styleVersion,
    path.basename(absolutePath),
    String(stat.size),
    String(stat.mtimeMs),
  ].join(":");

  return {
    absolutePath,
    filename: Classic2DStyleProfile.masterReferenceFilename,
    bytes,
    mimeType: "image/png",
    styleVersion: config.styleVersion || Classic2DStyleProfile.styleVersion,
    referenceId,
    source,
  };
}

export async function replaceMasterStyleReference(
  fileBytes: Buffer,
  updatedBy = "admin",
): Promise<MasterReferenceAsset> {
  const { writeAdminConfig } = await import("./admin-config");
  const target = getOverrideReferencePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, fileBytes);

  // Keep a public preview copy for the admin UI
  const publicCopy = path.join(
    process.cwd(),
    "public",
    "style-references",
    "classic-2d-master.png",
  );
  await fs.mkdir(path.dirname(publicCopy), { recursive: true });
  await fs.writeFile(publicCopy, fileBytes);

  const relative = path.relative(process.cwd(), target);
  await writeAdminConfig(
    { masterReferencePath: relative },
    updatedBy,
  );

  return loadMasterStyleReference();
}
