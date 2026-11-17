"use client";

import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

// shadcn-style Calendar, backed by DayPicker's keyboard and focus handling.
export function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker showOutsideDays weekStartsOn={1} fixedWeeks className={cn("w-full", className)}
    classNames={{
      months: "relative w-full", month: "w-full space-y-4", month_caption: "flex h-10 items-center justify-center font-semibold",
      nav: "absolute inset-x-0 top-0 flex items-center justify-between",
      button_previous: "z-10 flex size-10 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
      button_next: "z-10 flex size-10 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
      month_grid: "w-full table-fixed border-collapse", weekdays: "", weekday: "pb-3 text-center text-xs font-normal text-muted-foreground",
      week: "", day: "relative p-0.5 text-center text-sm [&.selected_button]:rounded-lg",
      day_button: "relative mx-auto flex h-11 w-full max-w-12 items-center justify-center rounded-lg font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
      selected: "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary/90",
      today: "[&_button]:font-bold [&_button]:underline [&_button]:underline-offset-4",
      outside: "opacity-30", disabled: "opacity-25", hidden: "invisible",
      ...classNames,
    }} components={{ Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" /> }} {...props} />;
}
