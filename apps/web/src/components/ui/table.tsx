"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "./utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

type TableSortDirection = "asc" | "desc" | null;

type TableHeadProps = React.ComponentProps<"th"> & {
  sortable?: boolean;
  sortDirection?: TableSortDirection;
  onSort?: () => void;
  sortLabel?: string;
  sortButtonClassName?: string;
  hideSortIcon?: boolean;
};

function getSortAlignmentClass(className?: string) {
  if (!className) return "justify-start";
  if (className.includes("text-center")) return "justify-center";
  if (className.includes("text-right")) return "justify-end";
  return "justify-start";
}

function TableHead({
  className,
  sortable = false,
  sortDirection = null,
  onSort,
  sortLabel,
  sortButtonClassName,
  hideSortIcon = false,
  children,
  ...props
}: TableHeadProps) {
  const isSortable = sortable || typeof onSort === "function";
  const alignmentClass = getSortAlignmentClass(className);
  let ariaSort: React.AriaAttributes["aria-sort"];

  if (isSortable) {
    if (sortDirection === "asc") {
      ariaSort = "ascending";
    } else if (sortDirection === "desc") {
      ariaSort = "descending";
    } else {
      ariaSort = "none";
    }
  }

  let sortIcon: React.ReactNode = null;

  if (!hideSortIcon) {
    if (sortDirection === "asc") {
      sortIcon = <ChevronUp className="size-4 shrink-0" aria-hidden="true" />;
    } else if (sortDirection === "desc") {
      sortIcon = (
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      );
    } else {
      sortIcon = (
        <ArrowUpDown
          className="size-4 shrink-0 opacity-60"
          aria-hidden="true"
        />
      );
    }
  }

  return (
    <th
      data-slot="table-head"
      aria-sort={ariaSort}
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    >
      {isSortable ? (
        <button
          type="button"
          onClick={onSort}
          aria-label={sortLabel}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm text-inherit outline-none transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            alignmentClass,
            sortButtonClassName,
          )}
        >
          <span className="truncate">{children}</span>
          {sortIcon}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  type TableSortDirection,
};
