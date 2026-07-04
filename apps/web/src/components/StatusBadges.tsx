import { cn } from "@monorepo/utils/styles";
import { CheckCircle2, XCircle } from "lucide-react";

type StatusBadgeProps = {
    active: boolean;
    activeLabel?: string;
    inactiveLabel?: string;
    className?: string;
};

export function StatusBadge({
    active,
    activeLabel = "Active",
    inactiveLabel = "Inactive",
    className,
}: StatusBadgeProps) {
    const Icon = active ? CheckCircle2 : XCircle;

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ring-1",
                active
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-rose-50 text-rose-700 ring-rose-200",
                className
            )}
        >
            <Icon className="mr-1.5 h-4 w-4" />
            {active ? activeLabel : inactiveLabel}
        </span>
    );
}