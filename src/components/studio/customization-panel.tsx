"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BACKGROUNDS,
  EXPRESSIONS,
  STANCES,
  SWORD_COLORS,
  SWORD_DESIGNS,
  SWORD_POSITIONS,
  type CharacterCustomization,
} from "@/lib/style/types";

type UserSettingKey = Exclude<keyof CharacterCustomization, "framing">;

const LABELS: Record<UserSettingKey, string> = {
  swordColor: "Energy Sword Color",
  swordDesign: "Sword Design",
  swordPosition: "Sword Position",
  stance: "Stance",
  expression: "Expression",
  background: "Background",
};

const OPTIONS: {
  [K in UserSettingKey]: readonly CharacterCustomization[K][];
} = {
  swordColor: SWORD_COLORS,
  swordDesign: SWORD_DESIGNS,
  swordPosition: SWORD_POSITIONS,
  stance: STANCES,
  expression: EXPRESSIONS,
  background: BACKGROUNDS,
};

function formatOption(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface CustomizationPanelProps {
  value: CharacterCustomization;
  onChange: (next: CharacterCustomization) => void;
  disabled?: boolean;
}

export function CustomizationPanel({
  value,
  onChange,
  disabled,
}: CustomizationPanelProps) {
  const keys = Object.keys(LABELS) as UserSettingKey[];

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="font-[family-name:var(--font-display)] text-base text-[color:var(--ink)] sm:text-lg">
        Character
      </legend>
      <div className="grid gap-3">
        {keys.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-[color:var(--muted-copy)]">
              {LABELS[key]}
            </Label>
            <Select
              value={value[key]}
              disabled={disabled}
              onValueChange={(next) => {
                if (!next) return;
                onChange({
                  ...value,
                  [key]: next,
                  framing: "three-quarter",
                });
              }}
            >
              <SelectTrigger
                id={key}
                className="min-h-11 w-full bg-[color:var(--void)]/50"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS[key].map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatOption(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
