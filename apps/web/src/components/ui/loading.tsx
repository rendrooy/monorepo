'use client'

import { Loader2 } from "lucide-react";
import { cn } from "./utils";

interface LoadingProps {
    size?: number;
    text?: string;
    fullScreen?: boolean;
    className?: string;
}

export default function Loading({
    size = 24,
    text,
    fullScreen = false,
    className
}: LoadingProps) {
    const content = (
        <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
            <Loader2
                size={size}
                className="animate-spin text-slate-500"
            />
            {text && (
                <p className="text-sm text-muted-foreground">{text}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                {content}
            </div>
        );
    }

    return content;
}