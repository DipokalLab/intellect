import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircleQuestionMark } from "lucide-react";

export function Credit() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CircleQuestionMark />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What is Intellect</DialogTitle>
          <DialogDescription>
            "Intellect" is a website that summarizes the achievements of great
            people who changed the world.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
