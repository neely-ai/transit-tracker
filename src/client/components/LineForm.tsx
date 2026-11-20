import { Check } from "lucide-react";
import { useState } from "react";
import { swatchClass } from "@/client/components/LineBadge";
import { Picker } from "@/client/components/Picker";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  COLOR_LABELS,
  KIND_LABELS,
  LINE_COLORS,
  LINE_KINDS,
  type LineColor,
  type LineKind,
} from "@/shared/network";

export interface LineValues {
  code: string;
  kind: LineKind;
  fromName: string;
  toName: string;
  color: LineColor;
}

/** Code, kind, terminals and colour of a line. */
export function LineForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: LineValues;
  submitLabel: string;
  onSubmit: (values: LineValues) => Promise<void>;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [kind, setKind] = useState<LineKind | null>(initial?.kind ?? null);
  const [fromName, setFromName] = useState(initial?.fromName ?? "");
  const [toName, setToName] = useState(initial?.toName ?? "");
  const [color, setColor] = useState<LineColor>(initial?.color ?? "blue");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!kind) return;
        setPending(true);
        try {
          await onSubmit({ code, kind, fromName, toName, color });
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="line-code">Code</Label>
          <Input
            id="line-code"
            data-testid="line-code"
            placeholder="36B"
            maxLength={12}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Kind</Label>
          <Picker
            testId="line-kind"
            label="Kind"
            placeholder="Choose one"
            value={kind}
            onChange={(value) => setKind(value as LineKind)}
            items={LINE_KINDS.map((value) => ({
              value,
              label: KIND_LABELS[value],
            }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="line-from">From</Label>
          <Input
            id="line-from"
            data-testid="line-from"
            required
            maxLength={80}
            value={fromName}
            onChange={(event) => setFromName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="line-to">To</Label>
          <Input
            id="line-to"
            data-testid="line-to"
            required
            maxLength={80}
            value={toName}
            onChange={(event) => setToName(event.target.value)}
          />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {LINE_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              data-testid={`color-${value}`}
              aria-label={COLOR_LABELS[value]}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
              className={`flex size-8 items-center justify-center rounded-full text-primary-foreground ring-offset-2 ring-offset-background aria-pressed:ring-2 aria-pressed:ring-ring ${swatchClass(value)}`}
            >
              {color === value ? <Check className="size-4" /> : null}
            </button>
          ))}
        </div>
      </fieldset>
      <Button
        type="submit"
        data-testid="line-save"
        pending={pending}
        disabled={!kind || !code.trim() || !fromName.trim() || !toName.trim()}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
