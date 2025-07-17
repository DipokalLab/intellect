import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

export function FilterButton() {
  return (
    <Button variant="outline">
      <SlidersHorizontal />
    </Button>
  );
}
