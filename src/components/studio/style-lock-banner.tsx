import { Classic2DStyleProfile } from "@/lib/style/classic-2d-style-profile";
import { Badge } from "@/components/ui/badge";

export function StyleLockBanner() {
  return (
    <div className="style-lock flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--ink-soft)]/15 bg-[color:var(--panel)]/80 px-4 py-3 backdrop-blur-sm">
      <Badge
        variant="secondary"
        className="bg-[color:var(--plasma)] text-[color:var(--ink)] font-semibold tracking-wide"
      >
        Style locked
      </Badge>
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-display)] text-sm text-[color:var(--ink)]">
          {Classic2DStyleProfile.name}
        </p>
        <p className="text-xs text-[color:var(--muted-copy)]">
          Permanent aesthetic · {Classic2DStyleProfile.styleVersion} · not
          user-selectable
        </p>
      </div>
    </div>
  );
}
