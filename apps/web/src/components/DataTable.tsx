"use client";

import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "@monorepo/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@monorepo/ui/components/dropdown-menu";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationFirst,
    PaginationItem,
    PaginationLast,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@monorepo/ui/components/pagination";
import { EllipsisVertical, LucideEye, PencilLineIcon, Trash2 } from "lucide-react";
import { Select2, Select2Trigger, Select2Value, Select2Content, Select2Item } from "@monorepo/ui/components/select2";
import type { Metadata } from "@monorepo/types";

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

type ColumnType<T> = {
    field?: keyof T;
    header: string;
    sortable?: boolean;
    body?: (row: T) => React.ReactNode;
    style?: React.CSSProperties;
    bodyClassName?: string;
    skeletonWidth?: string;
};

type Props<T> = {
    data: T[];
    loading?: boolean;
    meta?: Metadata;
    showMeta?: boolean;
    columns: ColumnType<T>[];

    onMetaChange: (meta: Metadata) => void;

    // onEdit?: (row: T) => void;
    // onDelete?: (row: T) => void;
    // onDetail?: (row: T) => void;

    // actions?: (row: T) => React.ReactNode;
};

export function AppDataTable<T>({
    data,
    loading = false,
    meta,
    showMeta = true,
    columns,
    onMetaChange,
    // onEdit,
    // onDelete,
    // onDetail,
    // actions,
}: Props<T>) {
    const currentPage = meta?.page ?? 1;
    const pageSize = meta?.pageSize ?? 10;
    const total = meta?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Skeleton generator
    const renderSkeleton = (width = "80%") => (
        <div
            className="h-4 bg-gray-200 rounded animate-pulse"
            style={{ width }}
        />
    );

    // Fake rows for skeleton
    const skeletonRows = Array.from({ length: pageSize || 5 }).map((_, i) => ({
        id: `skeleton-${i}`,
    }));

    // Pagination numbers
    const getPageNumbers = (): (number | "...")[] => {
        if (totalPages <= 7)
            return Array.from({ length: totalPages }, (_, i) => i + 1);

        const pages: (number | "...")[] = [1];

        if (currentPage > 3) pages.push("...");

        for (
            let i = Math.max(2, currentPage - 1);
            i <= Math.min(totalPages - 1, currentPage + 1);
            i++
        ) {
            pages.push(i);
        }

        if (currentPage < totalPages - 2) pages.push("...");

        pages.push(totalPages);
        return pages;
    };

    const updateMeta = (changes: Partial<Metadata>) => {
        onMetaChange({
            ...meta,
            ...changes,
        });
    };

    const currentCount = Math.min(
        meta?.pageSize ?? 0,
        meta?.total ?? 0
    );

    return (
        <div className="space-y-4">
            {/* TABLE */}
            <div className="relative border border-slate-200 rounded-md">
                {/* Overlay Loader */}
                {loading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                <DataTable
                    value={(loading ? skeletonRows : data) as never[]}
                    loading={false}
                    removableSort
                    sortField={meta?.sortBy}
                    sortOrder={meta?.sortDir === "ASC" ? 1 : meta?.sortDir === "DESC" ? -1 : 0}
                    emptyMessage={
                        !loading && (
                            <div className="text-center py-6 text-gray-400">
                                No data found
                            </div>
                        )
                    }
                    onSort={(e) => {
                        updateMeta({
                            page: 1,
                            sortBy: e.sortField,
                            sortDir:
                                e.sortOrder === 1
                                    ? "ASC"
                                    : e.sortOrder === -1
                                        ? "DESC"
                                        : undefined,
                        });
                    }}
                    className="
                        [&_.p-datatable-wrapper]:overflow-visible
                        border-separate border-spacing-y-2
                        text-sm

                        [&_.p-datatable-thead>tr>th]:px-4
                        [&_.p-datatable-thead>tr>th]:py-3
                        [&_.p-datatable-thead>tr>th]:text-gray-500
                        [&_.p-datatable-thead>tr>th]:font-semibold
                        [&_.p-datatable-thead>tr>th]:bg-transparent

                        [&_.p-datatable-tbody>tr]:bg-white
                        [&_.p-datatable-tbody>tr]:shadow-sm
                        [&_.p-datatable-tbody>tr]:rounded-lg
                        [&_.p-datatable-tbody>tr]:transition
                        [&_.p-datatable-tbody>tr:hover]:shadow-md
                        [&_.p-datatable-tbody>tr:hover]:bg-gray-50

                        [&_.p-datatable-tbody>tr>td]:px-4
                        [&_.p-datatable-tbody>tr>td]:py-4
                    "
                >
                    {/* Dynamic Columns */}
                    {columns?.map((col, index) => (
                        <Column
                            key={index}
                            field={col.field as string}
                            header={col.header}
                            sortable={col.sortable}
                            body={(row: T) => {
                                if (loading) {
                                    return renderSkeleton(
                                        col.skeletonWidth || "80%"
                                    );
                                }
                                return col.body
                                    ? col.body(row)
                                    : (row as any)[col.field as string];
                            }}
                            style={col.style}
                            bodyClassName={col.bodyClassName}
                        />
                    ))}

                    {/* {actions && (
                        <Column
                            body={(row: T) =>
                                loading ? renderSkeleton("20px") : actions(row)
                            }
                            bodyClassName="w-[60px]"
                        />
                    )} */}

                    {/* {!actions && (onDetail || onEdit || onDelete) && (
                        <Column
                            header="Action"
                            body={(row: T) => {
                                if (loading) return renderSkeleton("20px");

                                return (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <EllipsisVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end">
                                            {onDetail ? (
                                                <DropdownMenuItem onClick={() => onDetail(row)}>
                                                    <LucideEye className="w-4 h-4 mr-2" />
                                                    View
                                                </DropdownMenuItem>
                                            ) : null}

                                            {onEdit ? (
                                                <DropdownMenuItem onClick={() => onEdit(row)}>
                                                    <PencilLineIcon className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                            ) : null}

                                            {onDelete ? (
                                                <DropdownMenuItem
                                                    onClick={() => onDelete(row)}
                                                    className="text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                );
                            }}
                            bodyClassName="w-[60px]"
                        />
                    )} */}
                </DataTable>
            </div>

            {/* PAGINATION */}
            {
                showMeta && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Menampilkan</span>
                            <Select2
                                value={(meta?.pageSize ?? 10).toString()}
                                disabled={
                                    !meta?.total ||
                                    !meta?.pageSize ||
                                    meta?.total <= meta?.pageSize
                                }
                                className="border-slate-200 border-2"
                                searchable={false}
                                onValueChange={(val) =>
                                    updateMeta({
                                        page: 1,
                                        pageSize: Number(val),
                                    })
                                }
                            >
                                <Select2Trigger>
                                    {/* 👇 ini yang diubah */}
                                    <span className="font-medium">
                                        {currentCount}
                                    </span>
                                </Select2Trigger>

                                <Select2Content>
                                    {PAGE_SIZE_OPTIONS.map((s) => (
                                        <Select2Item key={s} value={s}>
                                            {s}
                                        </Select2Item>
                                    ))}
                                </Select2Content>
                            </Select2>

                            <span>
                                dari
                            </span>
                            <span className="font-medium">{total}</span>
                            <span>
                                data
                            </span>
                        </div>

                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationFirst
                                        onClick={() => updateMeta({ page: 1 })}
                                        className={
                                            currentPage === 1
                                                ? "pointer-events-none opacity-40"
                                                : ""
                                        }
                                    />
                                </PaginationItem>

                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() =>
                                            updateMeta({
                                                page: Math.max(currentPage - 1, 1)
                                            })
                                        }
                                        className={
                                            currentPage === 1
                                                ? "pointer-events-none opacity-40"
                                                : ""
                                        }
                                    />
                                </PaginationItem>

                                {getPageNumbers().map((p, i) => {
                                    const key = `${p}-${i}`; // 🔥 fix utama

                                    return p === "..." ? (
                                        <PaginationItem key={key}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    ) : (
                                        <PaginationItem key={key}>
                                            <PaginationLink
                                                isActive={currentPage === p}
                                                onClick={() =>
                                                    updateMeta({ page: p as number, pageSize })
                                                }
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() =>
                                            updateMeta({
                                                page: Math.min(
                                                    currentPage + 1,
                                                    totalPages
                                                )
                                            })
                                        }
                                        className={
                                            currentPage === totalPages
                                                ? "pointer-events-none opacity-40"
                                                : ""
                                        }
                                    />
                                </PaginationItem>

                                <PaginationItem>
                                    <PaginationLast
                                        onClick={() =>
                                            updateMeta({ page: totalPages })
                                        }
                                        className={
                                            currentPage === totalPages
                                                ? "pointer-events-none opacity-40"
                                                : ""
                                        }
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )
            }
        </div >
    );
}
