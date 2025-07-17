import React, { useState, useEffect } from "react";
import { UserSearch, ChevronsUpDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGraphStore } from "../graph/store";

interface PersonNode {
  id: string;
  name: string;
}

interface GraphData {
  persons: PersonNode[];
}

interface TopPersonSearchProps {
  onPersonSelect?: (person: PersonNode | null) => void;
}

export function TopPersonSearch({ onPersonSelect }: TopPersonSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const persons = useGraphStore((state) => state.persons);
  const status = useGraphStore((state) => state.status);
  const setFocusedPerson = useGraphStore((state) => state.setFocusedPerson);

  const isLoading = status === "idle";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between text-muted-foreground"
          disabled={isLoading}
        >
          <div className="flex items-center">
            <UserSearch className="mr-2 h-4 w-4" />
            {isLoading
              ? "Loading..."
              : value
              ? persons.find((person) => person.name.toLowerCase() === value)
                  ?.name
              : "Search person..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search person by name..." />
          <CommandList>
            <CommandEmpty>No person found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-72">
                {persons.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.name.toLowerCase()}
                    onSelect={(currentValue) => {
                      const selected = persons.find(
                        (p) => p.name.toLowerCase() === currentValue
                      );
                      setValue(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setFocusedPerson(selected?.id || null);

                      if (onPersonSelect) {
                        onPersonSelect(selected || null);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === person.name.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {person.name}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
