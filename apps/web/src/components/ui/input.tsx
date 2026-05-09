import * as React from "react";
import { cn } from "./utils";

export interface InputProps extends React.ComponentPropsWithoutRef<"input"> {
  startAdornment?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startAdornment, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {startAdornment ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              {startAdornment}
            </span>
          ) : null}

          <input
            ref={ref}
            type={type}
            data-slot="input"
            aria-invalid={!!error}
            className={cn(
              "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
              "dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border py-1 text-base bg-input-background",
              "transition-[color,box-shadow] outline-none md:text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              startAdornment ? "pl-10 pr-3" : "px-3",
              error && "border-red-500 focus-visible:ring-red-500/30 focus-visible:border-red-500",
              className
            )}
            {...props}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";