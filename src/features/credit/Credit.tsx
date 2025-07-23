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
          <DialogTitle>Intellect</DialogTitle>
          <DialogDescription>
            "Intellect" is a website that summarizes the achievements of great
            people who changed the world. <br /> <br /> All code and data are
            open-sourced, so anyone can contribute. Please contribute via{" "}
            <a
              href="https://https://github.com/DipokalLab/intellect"
              target="_blank"
              rel="noopener noreferrer"
            >
              the link
            </a>
            . <br /> <br />
            <b>Contributor</b> <br />
            <a
              href="https://hhj.devent.kr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              H. Jun Huh (Maintainer)
            </a>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
