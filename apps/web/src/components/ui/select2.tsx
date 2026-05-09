"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";
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
  className = "",
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
  };

function Select2Trigger({
  className,
  children,
  error,
  ...props
}: Select2TriggerProps) {
  return (
    <div className="w-full">
      <SelectPrimitive.Trigger
        aria-invalid={!!error}
        className={cn(
          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
          error
            ? "border-red-500 focus:ring-red-500/30"
            : "border-input",
          className
        )}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

/* ================================
   CONTENT + OPTIONAL SEARCH
================================ */

// function Select2Content({
//   className,
//   children,
//   loading = false,
//   loadingText = "Loading...",
//   ...props
// }: React.ComponentProps<typeof SelectPrimitive.Content> & {
//   loading?: boolean;
//   loadingText?: string;
// }) {
//   const { search, setSearch, searchable } = useSelectSearch();

//   return (
//     <SelectPrimitive.Portal>
//       <SelectPrimitive.Content
//         position="popper"
//         sideOffset={4}
//         className={cn(
//           "z-50 w-[var(--radix-select-trigger-width)] rounded-md border bg-white shadow-md",
//           className,
//         )}
//         {...props}
//       >
//         {searchable && (
//           <div className="flex h-10 items-center gap-2 border-b px-2">
//             <Search className="size-4 opacity-50" />
//             <input
//               type="text"
//               placeholder="Search..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key !== "Escape") {
//                   e.stopPropagation();
//                 }
//               }}
//               className="w-full bg-transparent text-sm outline-none"
//             />
//           </div>
//         )}

//         <SelectPrimitive.Viewport
//           className={cn(
//             "overflow-y-auto p-1",
//             searchable ? "h-60" : "max-h-60",
//           )}
//         >
//           {loading ? (
//             <div className="px-2 py-2 text-sm text-slate-500">{loadingText}</div>
//           ) : (
//             children
//           )}
//         </SelectPrimitive.Viewport>
//       </SelectPrimitive.Content>
//     </SelectPrimitive.Portal>
//   );
// }
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
        position="popper"
        sideOffset={4}
        className={cn(
          "z-50 w-[var(--radix-select-trigger-width)] rounded-md border bg-white shadow-md",
          className,
        )}
        {...props}
      >
        {searchable && (
          <div className="flex items-center gap-2 border-b px-2 py-2 bg-white sticky top-0 z-10">
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
              className="flex-1 bg-transparent text-sm outline-none leading-none"
            />
          </div>
        )}

        <SelectPrimitive.Viewport
          // ref={ref}
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
   ITEM (FILTER ONLY IF SEARCH ENABLED)
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
    const label =
      searchText ?? (typeof children === "string" ? children : "");

    const isVisible = label
      .toLowerCase()
      .includes(search.toLowerCase());

    if (!isVisible) return null;
  }

  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer items-center rounded-sm py-2 pr-8 pl-2 text-sm hover:bg-gray-100",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/* ================================
   VALUE
================================ */

function Select2Value({
  // children intentionally omitted — SelectPrimitive.Value renders selected ItemText internally
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
