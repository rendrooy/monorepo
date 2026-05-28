"use client";

import { type ReactNode } from "react";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Button } from "@monorepo/ui/components/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@monorepo/ui/components/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationFirst,
    PaginationLast,
    PaginationEllipsis,
} from "@monorepo/ui/components/pagination";
import {
    Select2,
    Select2Content,
    Select2Item,
    Select2Trigger,
    Select2Value,
} from "@monorepo/ui/components/select2";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, PlusIcon } from "lucide-react";
import type { Metadata } from "@monorepo/types";
// import { Card } from "@@monorepo/ui/components/card";

export interface ColumnDef<T> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    isLoading?: boolean;
    meta: Metadata;
    onMetaChange: (meta: Partial<Metadata>) => void;
    onAdd?: () => void;
    addLabel?: string;
    emptyText?: string;
    actionColumn?: (item: T) => ReactNode;
}

const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

export function DataTable<T extends { id?: string | null }>({
    columns,
    data,
    isLoading,
    meta,
    onMetaChange,
    onAdd,
    addLabel = "Tambah Data",
    emptyText = "Tidak ada data",
    actionColumn,
}: DataTableProps<T>) {
    const currentPage = meta.page ?? 1;
    const pageSize = meta.pageSize ?? 10;
    const total = meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleSort = (key: string) => {
        if (meta.sortBy === key) {
            onMetaChange({ sortBy: key, sortDir: meta.sortDir === "ASC" ? "DESC" : "ASC", page: 1 });
        } else {
            onMetaChange({ sortBy: key, sortDir: "ASC", page: 1 });
        }
    };

    const renderSortIcon = (key: string) => {
        if (meta.sortBy !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
        return meta.sortDir === "ASC"
            ? <ArrowUp className="w-3 h-3 ml-1" />
            : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    // Build visible page numbers with ellipsis
    const getPageNumbers = (): (number | "...")[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "...")[] = [1];
        if (currentPage > 3) pages.push("...");
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    return (
        <Card className="border-slate-200 shadow-sm mt-6">
            <CardContent className="p-6">
                {onAdd && (
                    <Button type="button" variant="outline" onClick={onAdd} className="mb-4">
                        <PlusIcon className="w-4 h-4 mr-1" />
                        {addLabel}
                    </Button>
                )}

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[60px] text-center">No</TableHead>
                                    {columns.map((col) => (
                                        <TableHead key={col.key}>
                                            {col.sortable ? (
                                                <button
                                                    className="flex items-center font-medium hover:text-foreground"
                                                    onClick={() => handleSort(col.key)}
                                                >
                                                    {col.label}
                                                    {renderSortIcon(col.key)}
                                                </button>
                                            ) : (
                                                col.label
                                            )}
                                        </TableHead>
                                    ))}
                                    {actionColumn && (
                                        <TableHead className="text-center w-[120px]">Action</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {data.length > 0 ? (
                                    data.map((item, index) => (
                                        <TableRow key={item.id ?? index}>
                                            <TableCell className="text-center">
                                                {(currentPage - 1) * pageSize + index + 1}
                                            </TableCell>
                                            {columns.map((col) => (
                                                <TableCell key={col.key}>
                                                    {col.render
                                                        ? col.render(item, index)
                                                        : String((item as any)[col.key] ?? "-")}
                                                </TableCell>
                                            ))}
                                            {actionColumn && (
                                                <TableCell className="text-center">
                                                    {actionColumn(item)}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length + (actionColumn ? 2 : 1)}
                                            className="text-center py-10 text-slate-500"
                                        >
                                            {emptyText}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* FOOTER: page size + pagination + total info */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Menampilkan</span>
                        <Select2
                            className="border-slate-200 border-2"
                            searchable={false}
                            value={pageSize.toString()}
                            onValueChange={(val) =>
                                onMetaChange({ pageSize: Number(val), page: 1 })
                            }
                        >
                            <Select2Trigger>
                                <Select2Value placeholder="10" />
                            </Select2Trigger>
                            <Select2Content>
                                {PAGE_SIZE_OPTIONS.map((s) => (
                                    <Select2Item key={s} value={s}>{s}</Select2Item>
                                ))}
                            </Select2Content>
                        </Select2>
                        <span>dari {total} data</span>
                    </div>

                    <Pagination className="w-auto mx-0">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationFirst
                                    onClick={() => onMetaChange({ page: 1 })}
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => onMetaChange({ page: Math.max(currentPage - 1, 1) })}
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                                />
                            </PaginationItem>

                            {getPageNumbers().map((p, i) =>
                                p === "..." ? (
                                    <PaginationItem key={`ellipsis-${i}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={p}>
                                        <PaginationLink
                                            isActive={currentPage === p}
                                            onClick={() => onMetaChange({ page: p })}
                                        >
                                            {p}
                                        </PaginationLink>
                                    </PaginationItem>
                                )
                            )}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => onMetaChange({ page: Math.min(currentPage + 1, totalPages) })}
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLast
                                    onClick={() => onMetaChange({ page: totalPages })}
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </CardContent>
        </Card>
    );
}
