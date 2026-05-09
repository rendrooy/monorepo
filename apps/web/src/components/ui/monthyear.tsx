// MonthYearPicker.tsx
import React, { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export type YearMonth = {
  year: number;
  month: number; // one-based: 1..12
};

export interface MonthYearPickerProps {
  initialYear?: number;
  initialMonth?: number; // one-based
  value?: YearMonth | null; // controlled when provided (not undefined/null)
  onChange?: (v: YearMonth) => void;
  className?: string;
  disableYearChange?: boolean;
  // New flags (default: true)
  allowBackMonth?: boolean;
  allowNextMonth?: boolean;
  allowBackYear?: boolean;
  allowNextYear?: boolean;
}

const clampOneBased = (m: number): number =>
  Math.min(12, Math.max(1, Math.floor(m)));

function MonthYearPicker({
  initialYear,
  initialMonth,
  value,
  onChange,
  className = "",
  disableYearChange = false,
  allowBackMonth = true,
  allowNextMonth = true,
  allowBackYear = true,
  allowNextYear = true,
}: Readonly<MonthYearPickerProps>): React.ReactElement {
  // Controlled detection: compare directly with undefined/null (Sonar-friendly)
  const isControlled = value !== undefined && value !== null;

  const defaultYear = initialYear ?? new Date().getFullYear();
  const defaultMonth = initialMonth
    ? clampOneBased(initialMonth)
    : new Date().getMonth() + 1;

  // local state used only in uncontrolled mode
  const [localYear, setLocalYear] = useState<number>(defaultYear);
  const [localMonthOneBased, setLocalMonthOneBased] =
    useState<number>(defaultMonth);

  // displayed values (if controlled, from value; else from local state)
  const displayedYear = value?.year ?? localYear;
  const displayedMonthOneBased = clampOneBased(
    value?.month ?? localMonthOneBased,
  );

  // "Today" baseline for flag checks
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonthOneBased = today.getMonth() + 1;

  // Helper: apakah sebuah (year, month) tidak boleh dipilih menurut flags
  const isMonthDisabled = useCallback(
    (targetYear: number, targetMonthOneBased: number): boolean => {
      // Year-level restrictions first
      if (!allowBackYear && targetYear < todayYear) {
        return true;
      }
      if (!allowNextYear && targetYear > todayYear) {
        return true;
      }
      // If the target year is the current year, apply month-level restrictions
      if (targetYear === todayYear) {
        if (!allowBackMonth && targetMonthOneBased < todayMonthOneBased) {
          return true;
        }
        if (!allowNextMonth && targetMonthOneBased > todayMonthOneBased) {
          return true;
        }
      }
      return false;
    },
    [
      allowBackYear,
      allowNextYear,
      allowBackMonth,
      allowNextMonth,
      todayYear,
      todayMonthOneBased,
    ],
  );

  // Helper: apakah bisa pindah tahun dengan delta (mis. -1 atau +1)
  const canChangeYear = useCallback(
    (delta: number): boolean => {
      const targetYear = displayedYear + delta;
      if (!allowBackYear && targetYear < todayYear) {
        return false;
      }
      if (!allowNextYear && targetYear > todayYear) {
        return false;
      }
      return true;
    },
    [displayedYear, allowBackYear, allowNextYear, todayYear],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        format(new Date(displayedYear, i, 1), "LLL", { locale: idLocale }),
      ),
    [displayedYear],
  );

  const emitChange = useCallback(
    (nextYear: number, nextMonth: number): void => {
      if (onChange !== undefined && onChange !== null) {
        onChange({ year: nextYear, month: nextMonth });
      }
    },
    [onChange],
  );

  const handleSelectMonth = useCallback(
    (mOneBased: number): void => {
      const clamped = clampOneBased(mOneBased);
      // Prevent selection if disabled by flags (based on today)
      if (isMonthDisabled(displayedYear, clamped)) {
        return;
      }

      if (!isControlled) {
        setLocalMonthOneBased(clamped);
      }
      emitChange(displayedYear, clamped);
    },
    [isControlled, displayedYear, emitChange, isMonthDisabled],
  );

  const handleChangeYear = useCallback(
    (delta: number): void => {
      if (disableYearChange) {
        return;
      }
      if (!canChangeYear(delta)) {
        return;
      }
      const nextYear = displayedYear + delta;

      // If the nextYear would make the current month selection invalid (w.r.t flags),
      // we keep the month but the caller can decide. Here we only change year.
      if (!isControlled) {
        setLocalYear(nextYear);
        // If local month becomes out-of-range for nextYear (e.g., nextYear < todayYear and allowBackYear false),
        // we do not auto-change month. We simply emit current month with new year (subject to caller).
      }
      emitChange(nextYear, displayedMonthOneBased);
    },
    [
      disableYearChange,
      displayedYear,
      displayedMonthOneBased,
      isControlled,
      emitChange,
      canChangeYear,
    ],
  );

  return (
    <div
      className={`w-64 bg-white rounded-lg shadow-md p-4 font-sans ${className}`}
    >
      {/* Top: year navigation only */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Prev year"
          onClick={() => handleChangeYear(-1)}
          className={`p-2 rounded-md hover:bg-gray-100 transition ${
            disableYearChange || !canChangeYear(-1)
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          disabled={disableYearChange || !canChangeYear(-1)}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="text-center">
          {/* <div className="text-sm text-gray-500">Tahun</div> */}
          <div className="text-lg font-semibold text-gray-800">
            {displayedYear}
          </div>
        </div>

        <button
          type="button"
          aria-label="Next year"
          onClick={() => handleChangeYear(1)}
          className={`p-2 rounded-md hover:bg-gray-100 transition ${
            disableYearChange || !canChangeYear(1)
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          disabled={disableYearChange || !canChangeYear(1)}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Months grid */}
      <div className="grid grid-cols-3 gap-1">
        {months.map((label, idx) => {
          const oneBased = idx + 1;
          const selected = oneBased === displayedMonthOneBased;
          const disabled = isMonthDisabled(displayedYear, oneBased);

          // Compose class without nested ternary (Sonar-friendly)
          const baseClass =
            "py-2 px-1 rounded-md text-center text-sm font-medium transition-colors";
          let stateClass = "bg-transparent text-gray-700 hover:bg-gray-100";
          if (selected) {
            stateClass = "bg-blue-600 text-white shadow";
          } else if (disabled) {
            stateClass = "bg-transparent text-gray-400 cursor-not-allowed";
          }

          const btnClass = `${baseClass} ${stateClass}`;

          return (
            <button
              key={`${displayedYear}-${oneBased}`}
              type="button"
              onClick={() => handleSelectMonth(oneBased)}
              aria-pressed={selected}
              aria-disabled={disabled}
              disabled={disabled}
              className={btnClass}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* <div className="mt-3 text-sm text-gray-600">
        Dipilih:{" "}
        <span className="font-medium text-gray-800">
          {months[displayedMonthOneBased - 1]} {displayedYear}
        </span>
      </div> */}
    </div>
  );
}

export default MonthYearPicker;
