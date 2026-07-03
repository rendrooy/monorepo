"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { useCallback, useState } from "react";

type ConfirmedAction = "create" | "update" | "delete";

type UseConfirmedActionProps<T> = {
    action: ConfirmedAction;
    entityLabel?: string;
    isLoading?: boolean;
    onConfirm: (payload: T) => Promise<void> | void;
};

const actionCopy: Record<ConfirmedAction, { title: string; message: string; confirmText: string }> = {
    create: {
        title: "Simpan Data?",
        message: "Pastikan data yang diisi sudah benar sebelum disimpan.",
        confirmText: "Simpan",
    },
    update: {
        title: "Update Data?",
        message: "Pastikan perubahan data sudah benar sebelum diupdate.",
        confirmText: "Update",
    },
    delete: {
        title: "Hapus Data?",
        message: "Data yang sudah dihapus tidak bisa dikembalikan.",
        confirmText: "Hapus",
    },
};

export function useConfirmedAction<T>({
    action,
    entityLabel = "data",
    isLoading = false,
    onConfirm,
}: UseConfirmedActionProps<T>) {
    const [pendingPayload, setPendingPayload] = useState<T | null>(null);
    const copy = actionCopy[action];

    const requestConfirmation = useCallback((payload: T) => {
        setPendingPayload(payload);
    }, []);

    const handleCancel = useCallback(() => {
        if (isLoading) return;

        setPendingPayload(null);
    }, [isLoading]);

    const handleConfirm = useCallback(async () => {
        if (!pendingPayload) return;

        await onConfirm(pendingPayload);
        setPendingPayload(null);
    }, [onConfirm, pendingPayload]);

    const confirmationDialog = (
        <SwalDialog
            open={pendingPayload !== null}
            isLoading={isLoading}
            title={copy.title}
            message={`${copy.message} Konfirmasi ${entityLabel} ini?`}
            variant={action === "delete" ? "warning" : "info"}
            confirmText={copy.confirmText}
            cancelText="Batal"
            onCancel={handleCancel}
            onConfirm={handleConfirm}
        />
    );

    return {
        confirmationDialog,
        requestConfirmation,
    };
}
