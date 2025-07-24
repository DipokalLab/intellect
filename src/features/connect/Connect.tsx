import { Button } from "@/components/ui/button";
import { Pickaxe } from "lucide-react";
import { useGraphStore } from "../graph/store";

export function ConnectButton() {
  const { isConnectEnabled, setIsConnectEnabled, connected } =
    useGraphStore();

  return (
    <Button
      variant="outline"
      onClick={() => setIsConnectEnabled(!isConnectEnabled)}
    >
      <Pickaxe className="h-4 w-4" />
      Select
      {isConnectEnabled && (
        <span className="ml-2 text-xs text-muted-foreground">
          {connected.length} {connected.length === 1 ? "person" : "people"}{" "}
          selected
        </span>
      )}
    </Button>
  );
}
