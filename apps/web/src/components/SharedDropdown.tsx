import { useEffect, useRef, useState } from "react";
import { Label } from "@monorepo/ui/components/label";
import {
  Select2,
  Select2Content,
  Select2Item,
  Select2Trigger,
} from "@monorepo/ui/components/select2";

export type SharedDropdownOption = {
  id: string;
  label: string;
  nik?: string | null;
};

type SharedDropdownProps = {
  id: string;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options?: SharedDropdownOption[];
  loading?: boolean;
  disabled?: boolean;
  searchValue?: string;
  searchable?: boolean;
  onSearchChange?: (value: string) => void;
  allLabel?: string;
  clientFilter?: boolean;
  fetchOptions?: (
    search: string,
    signal: AbortSignal,
  ) => Promise<SharedDropdownOption[]>;
  fetchEnabled?: boolean;
  debounceMs?: number;
  requestKey?: string;
  className?: string;
  clearable?: boolean;
};

export function SharedDropdown({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  options,
  loading = false,
  disabled = false,
  searchValue,
  searchable = false,
  onSearchChange,
  allLabel,
  clientFilter = true,
  fetchOptions,
  fetchEnabled = true,
  debounceMs = 500,
  requestKey = "",
  className = "",
  clearable = false,
}: Readonly<SharedDropdownProps>) {
  const isAsync = Boolean(fetchOptions);
  const abortRef = useRef<AbortController | null>(null);
  const fetchOptionsRef = useRef(fetchOptions);

  fetchOptionsRef.current = fetchOptions;

  const [internalSearch, setInternalSearch] = useState("");
  const [internalOptions, setInternalOptions] = useState<
    SharedDropdownOption[]
  >([]);
  const [internalLoading, setInternalLoading] = useState(false);

  const resolvedSearch = searchValue ?? internalSearch;
  const resolvedOptions = isAsync ? internalOptions : options ?? [];
  const resolvedLoading = isAsync ? internalLoading : loading;
  const resolvedClientFilter = isAsync ? false : clientFilter;

  const displayLabel =
    value === "all"
      ? allLabel ?? ""
      : resolvedOptions.find((item) => item.id === value)?.label ?? value ?? "";

  useEffect(() => {
    if (!isAsync) return;

    if (!fetchEnabled || disabled) {
      abortRef.current?.abort();
      setInternalOptions([]);
      setInternalLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        abortRef.current?.abort();

        const controller = new AbortController();
        abortRef.current = controller;

        setInternalLoading(true);

        const result = await fetchOptionsRef.current!(
          resolvedSearch,
          controller.signal,
        );

        setInternalOptions(result ?? []);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.name === "AbortError" || err.message.includes("aborted"))
        ) {
          return;
        }

        console.error(`Failed fetch dropdown ${id}:`, err);
      } finally {
        setInternalLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debounceMs,
    disabled,
    fetchEnabled,
    id,
    isAsync,
    requestKey,
    resolvedSearch,
  ]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClear = () => {
    onValueChange("");
    onSearchChange?.("");
    setInternalSearch("");
  };

  return (
    <div className={`min-w-0 flex-1 space-y-2 ${className}`}>
      {label ? (
        <Label htmlFor={id} className="text-slate-700">
          {label}
        </Label>
      ) : null}

      <Select2
        searchable={searchable}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        searchValue={resolvedSearch}
        onSearchChange={onSearchChange ?? setInternalSearch}
        clientFilter={resolvedClientFilter}
      >
        <Select2Trigger
          id={id}
          className="border-slate-200 bg-white"
          clearable={clearable && !!value}
          onClear={() => onValueChange("")}
        >
          <span
            className={`block min-w-0 flex-1 truncate pr-2 text-sm ${!displayLabel ? "text-muted-foreground" : ""
              }`}
          >
            {resolvedLoading ? "Loading..." : displayLabel || placeholder}
          </span>
        </Select2Trigger>

        <Select2Content
          className="max-h-60 overflow-y-auto"
          loading={resolvedLoading}
        >
          {allLabel ? (
            <Select2Item value="all" searchText={allLabel}>
              {allLabel}
            </Select2Item>
          ) : null}

          {resolvedOptions.map((item) => (
            <Select2Item key={item.id} value={item.id} searchText={item.label}>
              {item.label}
            </Select2Item>
          ))}
        </Select2Content>
      </Select2>
    </div>
  );
}
