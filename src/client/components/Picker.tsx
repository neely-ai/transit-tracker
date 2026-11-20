import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

interface PickerItem {
  value: string;
  label: string;
}

/** A Select over a plain list of labelled values. */
export function Picker({
  items,
  value,
  onChange,
  placeholder,
  testId,
  label,
  className,
  disabled,
}: {
  items: PickerItem[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onChange(next as string);
      }}
    >
      <SelectTrigger
        data-testid={testId}
        aria-label={label}
        className={className ?? "w-full"}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
