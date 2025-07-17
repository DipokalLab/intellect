import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGraphStore } from "../graph/store";

export function FilterButton() {
  const [open, setOpen] = useState(false);
  const {
    persons,
    selectedFields,
    toggleField,
    clearAllFields,
    selectAllFields,
  } = useGraphStore();

  const availableFields = useMemo(() => {
    const fieldsSet = new Set<string>();
    persons.forEach((person) => {
      const fields = person.field.split(",").map((f) => f.trim());
      fields.forEach((field) => fieldsSet.add(field));
    });
    return Array.from(fieldsSet).sort();
  }, [persons]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filter Fields
          {selectedFields.length > 0 &&
            selectedFields.length < availableFields.length && (
              <Badge variant="secondary" className="ml-2">
                {selectedFields.length}
              </Badge>
            )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by Field</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllFields}
                className="h-8 px-2 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFields}
                className="h-8 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {availableFields.map((field) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={selectedFields.includes(field)}
                    onCheckedChange={() => toggleField(field)}
                  />
                  <label
                    htmlFor={field}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {field}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedFields.length > 0 &&
            selectedFields.length < availableFields.length && (
              <div className="pt-2 border-t">
                <div className="flex flex-wrap gap-1">
                  {selectedFields.map((field) => (
                    <Badge
                      key={field}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => toggleField(field)}
                    >
                      {field}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
