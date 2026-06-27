"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, Search, X } from "lucide-react";
import { cn } from "./utils";

/* ================================
   CONTEXT
================================ */

type SelectSearchContextType = {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchable: boolean;
  clientFilter: boolean;
};

const SelectSearchContext =
  React.createContext<SelectSearchContextType | null>(null);

function useSelectSearch() {
  const context = React.useContext(SelectSearchContext);

  if (!context) {
    throw new Error("Select2 components must be used inside Select2");
  }

  return context;
}

/* ================================
   ROOT
================================ */

type Select2Props = React.ComponentProps<typeof SelectPrimitive.Root> & {
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  clientFilter?: boolean;
  className?: string;
};

function Select2({
  children,
  searchable = true,
  clientFilter = true,
  searchValue,
  onSearchChange,
  onOpenChange,
  ...props
}: Select2Props) {
  const [internalSearch, setInternalSearch] = React.useState("");
  const search = searchValue ?? internalSearch;

  const setSearch: React.Dispatch<React.SetStateAction<string>> = (
    nextValue,
  ) => {
    const resolvedValue =
      typeof nextValue === "function" ? nextValue(search) : nextValue;

    if (searchValue === undefined) {
      setInternalSearch(resolvedValue);
    }

    onSearchChange?.(resolvedValue);
  };

  return (
    <SelectSearchContext.Provider
      value={{ search, setSearch, searchable, clientFilter }}
    >
      <SelectPrimitive.Root
        onOpenChange={(open) => {
          if (!open) setSearch("");
          onOpenChange?.(open);
        }}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectSearchContext.Provider>
  );
}

/* ================================
   TRIGGER
================================ */

type Select2TriggerProps =
  React.ComponentProps<typeof SelectPrimitive.Trigger> & {
    error?: string;
    clearable?: boolean;
    onClear?: () => void;
  };

function Select2Trigger({
  className,
  children,
  error,
  clearable = false,
  onClear,
  ...props
}: Select2TriggerProps) {
  return (
    <div className="w-full">
      <div className="relative">
        <SelectPrimitive.Trigger
          aria-invalid={!!error}
          className={cn(
            "flex min-h-10 w-full items-center rounded-md border px-3 py-2 text-sm",
            "bg-white text-left outline-none transition-colors",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            clearable ? "pr-16" : "pr-10",
            error ? "border-red-500 focus:ring-red-500/30" : "border-input",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Trigger>

        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2">
          {clearable && onClear ? (
            <button
              type="button"
              aria-label="Clear selection"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          ) : null}

          <SelectPrimitive.Icon asChild>
            <ChevronDownIcon className="pointer-events-none size-4 shrink-0 opacity-50" />
          </SelectPrimitive.Icon>
        </div>
      </div>

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

/* ================================
   CONTENT + OPTIONAL SEARCH
================================ */

const Select2Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof SelectPrimitive.Content> & {
    loading?: boolean;
    loadingText?: string;
    onViewportScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  }
>(function Select2Content(
  {
    className,
    children,
    loading = false,
    loadingText = "Loading...",
    onViewportScroll,
    ...props
  },
  ref,
) {
  const { search, setSearch, searchable } = useSelectSearch();

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position="popper"
        sideOffset={4}
        className={cn(
          "z-50 w-[var(--radix-select-trigger-width)] rounded-md border bg-white shadow-md",
          className,
        )}
        {...props}
      >
        {searchable ? (
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-2 py-2">
            <Search className="size-4 opacity-50" />

            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") {
                  e.stopPropagation();
                }
              }}
              className="flex-1 bg-transparent text-sm leading-none outline-none"
            />
          </div>
        ) : null}

        <SelectPrimitive.Viewport
          onScroll={onViewportScroll}
          className={cn(
            "overflow-y-auto p-1",
            searchable ? "h-60" : "max-h-60",
          )}
        >
          {loading ? (
            <div className="px-2 py-2 text-sm text-slate-500">
              {loadingText}
            </div>
          ) : (
            children
          )}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

/* ================================
   ITEM
================================ */

type Select2ItemProps = React.ComponentProps<typeof SelectPrimitive.Item> & {
  searchText?: string;
};

function Select2Item({
  className,
  children,
  searchText,
  ...props
}: Select2ItemProps) {
  const { search, searchable, clientFilter } = useSelectSearch();

  if (searchable && clientFilter) {
    const label = searchText ?? (typeof children === "string" ? children : "");

    const isVisible = label.toLowerCase().includes(search.toLowerCase());

    if (!isVisible) return null;
  }

  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer items-center rounded-sm py-2 pr-8 pl-2 text-sm outline-none hover:bg-gray-100",
        "focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/* ================================
   VALUE
================================ */

function Select2Value({
  children: _,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />;
}

/* ================================
   EXPORT
================================ */

export {
  Select2,
  Select2Trigger,
  Select2Content,
  Select2Item,
  Select2Value,
};