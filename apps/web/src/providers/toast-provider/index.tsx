"use client";

import { createContext, useContext, useRef } from "react";
import { Toast } from "primereact/toast";

/* ================== TYPES ================== */

type ToastOptions = {
    severity?: "success" | "info" | "warn" | "error";
    summary?: string;
    detail?: string;
    life?: number;
};

type ToastContextType = {
    show: (options: ToastOptions) => void;
    success: (detail: string, summary?: string) => void;
    error: (detail: string, summary?: string) => void;
    warn: (detail: string, summary?: string) => void;
    info: (detail: string, summary?: string) => void;
};

/* ================== CONTEXT ================== */

const ToastContext = createContext<ToastContextType | null>(null);

/* ================== PROVIDER ================== */

export const ToastProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const toast = useRef<Toast>(null);

    /* ================== CORE SHOW ================== */

    const show: ToastContextType["show"] = (options) => {
        toast.current?.show({
            ...options,
            content: (props) => {
                const { message } = props;

                /* COLOR BASED ON SEVERITY */
                const colorMap = {
                    success:
                        "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
                    error:
                        "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
                    warn:
                        "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
                    info:
                        "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
                };

                /* ICON */
                const iconMap = {
                    success: "✅",
                    error: "❌",
                    warn: "⚠️",
                    info: "ℹ️",
                };

                const color =
                    colorMap[message.severity as keyof typeof colorMap] ??
                    "bg-gray-50 border-gray-300 text-gray-700";

                return (
                    <div
                        className={`flex items-start gap-3 border shadow-xl rounded-xl p-4 min-w-[320px] max-w-[420px] transition-all duration-200 ${color}`}
                    >
                        {/* ICON */}
                        <div className="text-lg mt-0.5">
                            {iconMap[message.severity as keyof typeof iconMap]}
                        </div>

                        {/* TEXT */}
                        <div className="flex flex-col">
                            {message.summary && (
                                <span className="font-semibold text-sm">
                                    {message.summary}
                                </span>
                            )}
                            {message.detail && (
                                <span className="text-sm opacity-90">
                                    {message.detail}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        });
    };

    /* ================== HELPERS ================== */

    const success = (detail: string, summary = "Success") =>
        show({ severity: "success", summary, detail });

    const error = (detail: string, summary = "Error") =>
        show({ severity: "error", summary, detail });

    const warn = (detail: string, summary = "Warning") =>
        show({ severity: "warn", summary, detail });

    const info = (detail: string, summary = "Info") =>
        show({ severity: "info", summary, detail });

    /* ================== RENDER ================== */

    return (
        <ToastContext.Provider value={{ show, success, error, warn, info }}>
            <Toast ref={toast} position="top-right" />
            {children}
        </ToastContext.Provider>
    );
};

/* ================== HOOK ================== */

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
};