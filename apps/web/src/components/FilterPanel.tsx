"use client";

import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface FilterPanelProps {
    title?: string;
    onSubmit: () => void;
    onReset: () => void;
    children: ReactNode;
    submitLabel?: string;
    resetLabel?: string;
    /** Number of filter columns per row: 1 | 2 | 3 | 4. Defaults to 3. */
    columns?: 1 | 2 | 3 | 4;
}

const gridCols = (columns: number) => {
    if (columns === 1) return "grid grid-cols-1";
    if (columns === 2) return "grid grid-cols-1 md:grid-cols-2";
    if (columns === 4) return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    return "grid grid-cols-1 md:grid-cols-3"; // default 3
};

export function FilterPanel({
    title = "Cari Data",
    onSubmit,
    onReset,
    children,
    submitLabel = "Cari",
    resetLabel = "Bersihkan",
    columns = 3,
}: FilterPanelProps) {
    return (
        <Card className="border-slate-200 shadow-sm mt-6">
            <CardContent className="pt-6">
                <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                        <p className="font-medium">{title}</p>
                        <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                onSubmit();
                            }}
                        >
                            <div className="pt-6 space-y-6">
                                <div className={`${gridCols(columns)} gap-4`}>
                                    {children}
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="submit" variant="default">
                                        {submitLabel}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={onReset}>
                                        {resetLabel}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}
