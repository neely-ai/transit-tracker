import { useRouter } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/client/components/Reports";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { setFavorite } from "@/serverFunctions/member";
import { KIND_LABELS, type LineKind } from "@/shared/network";

export function StarButton({
  line,
}: {
  line: { id: string; code: string; favorite: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      data-testid={`star-${line.code}`}
      aria-label={line.favorite ? `Unstar ${line.code}` : `Star ${line.code}`}
      aria-pressed={line.favorite}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await setFavorite({
            data: { lineId: line.id, starred: !line.favorite },
          });
          await router.invalidate();
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          setPending(false);
        }
      }}
    >
      <Star
        className={
          line.favorite ? "fill-warning text-warning" : "text-muted-foreground"
        }
      />
    </Button>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <Badge variant="secondary">{KIND_LABELS[kind as LineKind] ?? kind}</Badge>
  );
}
