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
  FRAMINGS,
  STANCES,
  SWORD_COLORS,
  SWORD_DESIGNS,
  SWORD_POSITIONS,
  type CharacterCustomization,
} from "@/lib/style/types";

const LABELS: Record<keyof CharacterCustomization, string> = {
  swordColor: "Energy Sword Color",
  swordDesign: "Sword Design",
  swordPosition: "Sword Position",
  stance: "Stance",
  expression: "Expression",
  background: "Background",
  framing: "Framing",
};

const OPTIONS: {
  [K in keyof CharacterCustomization]: readonly CharacterCustomization[K][];
} = {
  swordColor: SWORD_COLORS,
  swordDesign: SWORD_DESIGNS,
  swordPosition: SWORD_POSITIONS,
  stance: STANCES,
  expression: EXPRESSIONS,
  background: BACKGROUNDS,
  framing: FRAMINGS,
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
  const keys = Object.keys(LABELS) as (keyof CharacterCustomization)[];

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="font-[family-name:var(--font-display)] text-lg text-[color:var(--ink)]">
        Character settings
      </legend>
      <p className="text-sm text-[color:var(--muted-copy)]">
        Customize the character only. The classic 2D animation style stays fixed
        for every generation.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {keys.map((key) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{LABELS[key]}</Label>
            <Select
              value={value[key]}
              disabled={disabled}
              onValueChange={(next) => {
                if (!next) return;
                onChange({ ...value, [key]: next });
              }}
            >
              <SelectTrigger id={key} className="w-full bg-[color:var(--panel)]">
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
