// components/SwalDialog.tsx
import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@monorepo/ui/components/button";
import { LoadingButton } from "@monorepo/ui/components/loading-button";

type Variant = "warning" | "success" | "info" | "error";

type SwalDialogProps = {
    open: boolean;
    isLoading?: boolean;
    title?: string;
    message?: string;
    variant?: Variant;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

const variantConfig = {
    warning: {
        icon: AlertTriangle,
        color: "text-yellow-500",
        bg: "bg-yellow-100",
    },
    success: {
        icon: CheckCircle2,
        color: "text-green-500",
        bg: "bg-green-100",
    },
    info: {
        icon: Info,
        color: "text-blue-500",
        bg: "bg-blue-100",
    },
    error: {
        icon: AlertTriangle,
        color: "text-red-500",
        bg: "bg-red-100",
    },
};

const SwalDialog: React.FC<SwalDialogProps> = ({
    open,
    isLoading = false,
    title = "Konfirmasi",
    message = "Apakah Anda yakin?",
    variant = "warning",
    confirmText = "Ya",
    cancelText = "Batal",
    onConfirm,
    onCancel,
}) => {
    if (!open) return null;

    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-[360px] text-center shadow-xl animate-in fade-in zoom-in-95">

                {/* ICON */}
                <div className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full ${config.bg}`}>
                    <Icon className={`w-8 h-8 ${config.color}`} />
                </div>

                {/* TITLE */}
                <h2 className="text-xl font-semibold mt-4">{title}</h2>

                {/* MESSAGE */}
                <p className="text-sm text-gray-500 mt-2 mb-6">
                    {message}
                </p>

                {/* ACTION */}
                <div className="flex justify-center gap-3">
                    <LoadingButton
                        isLoading={isLoading}
                        variant="outline"
                        onClick={onCancel}>
                        {cancelText}
                    </LoadingButton>
                    <LoadingButton
                        isLoading={isLoading}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </LoadingButton>
                </div>
            </div>
        </div>
    );
};

export default SwalDialog;