import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/client/components/ui/toggle-group";

export type Scope = "all" | "mine";

/** All lines, or only the member's starred ones. */
export function ScopeToggle({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (value: Scope) => void;
}) {
  return (
    <ToggleGroup
      size="sm"
      spacing={0.5}
      value={[value]}
      onValueChange={(next) => {
        if (next[0] === "all" || next[0] === "mine") onChange(next[0]);
      }}
      className="rounded-lg border border-border bg-muted p-0.5"
    >
      <ToggleGroupItem
        value="all"
        data-testid="scope-all"
        className="text-muted-foreground aria-pressed:bg-primary/15 aria-pressed:text-primary"
      >
        All lines
      </ToggleGroupItem>
      <ToggleGroupItem
        value="mine"
        data-testid="scope-mine"
        className="text-muted-foreground aria-pressed:bg-primary/15 aria-pressed:text-primary"
      >
        My lines
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
