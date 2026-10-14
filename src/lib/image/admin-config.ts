import { promises as fs } from "fs";
import path from "path";
import { STYLE_VERSION, type StyleVersion } from "@/lib/style/types";

export interface AdminStyleConfig {
  /**
   * Absolute or workspace-relative path to the master style PNG.
   * Administrators/developers may replace the file without changing app code.
   */
  masterReferencePath: string;
  /** Optional override of the public style version label. */
  styleVersion: StyleVersion;
  /** When true, /compare routes and multi-character consistency tools are enabled. */
  developerComparisonMode: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

const DEFAULT_RELATIVE_REFERENCE =
  "assets/style-references/classic-2d-master.png";

const CONFIG_PATH = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "data",
  "admin-config.json",
);

export function getDefaultAdminConfig(): AdminStyleConfig {
  return {
    masterReferencePath: DEFAULT_RELATIVE_REFERENCE,
    styleVersion: STYLE_VERSION,
    developerComparisonMode: process.env.DEV_COMPARISON_MODE === "true",
    updatedAt: null,
    updatedBy: null,
  };
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
}

export async function readAdminConfig(): Promise<AdminStyleConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminStyleConfig>;
    return {
      ...getDefaultAdminConfig(),
      ...parsed,
      styleVersion: (parsed.styleVersion as StyleVersion) || STYLE_VERSION,
    };
  } catch {
    return getDefaultAdminConfig();
  }
}

export async function writeAdminConfig(
  next: Partial<AdminStyleConfig>,
  updatedBy = "admin",
): Promise<AdminStyleConfig> {
  await ensureDataDir();
  const current = await readAdminConfig();
  const merged: AdminStyleConfig = {
    ...current,
    ...next,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

export function resolveReferencePath(relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  // Scope to known asset/data folders so Turbopack does not trace the whole repo.
  const normalized = relativeOrAbsolute.replace(/\\/g, "/");
  if (normalized.startsWith("assets/")) {
    return path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "assets",
      normalized.slice("assets/".length),
    );
  }
  if (normalized.startsWith("data/")) {
    return path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "data",
      normalized.slice("data/".length),
    );
  }
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "assets",
    "style-references",
    path.basename(normalized),
  );
}

/** Writable override location used when an admin uploads a replacement master. */
export function getOverrideReferencePath(): string {
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "data",
    "style-references",
    "classic-2d-master.png",
  );
}

export function getDefaultReferencePath(): string {
  return path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "assets",
    "style-references",
    "classic-2d-master.png",
  );
}

export { CONFIG_PATH, DEFAULT_RELATIVE_REFERENCE };
