"use client";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { Button } from "@monorepo/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@monorepo/ui/components/dropdown-menu";
import { EllipsisVertical, PencilLineIcon, Trash2 } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationFirst, PaginationItem, PaginationLast, PaginationLink, PaginationNext, PaginationPrevious } from "@monorepo/ui/components/pagination";

export function AppDataTable({
    data,
    loading,
    first,
    rows,
    meta,
    onPageChange,
    onEdit,
    onDelete,
}) {
    const currentPage = meta.page ?? 1;
    const pageSize = meta.pageSize ?? 10;
    const total = meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const totalRecords = meta.total
    // const handleSort = (key: string) => {
    //     if (meta.sortBy === key) {
    //         onMetaChange({ sortBy: key, sortDir: meta.sortDir === "ASC" ? "DESC" : "ASC", page: 1 });
    //     } else {
    //         onMetaChange({ sortBy: key, sortDir: "ASC", page: 1 });
    //     }
    // };

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
        <div className="space-y-4">
            {/* TABLE */}
            <div className="pt-6">
                <DataTable
                    value={data}
                    loading={loading}
                    removableSort
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
                    <Column
                        field="code"
                        header="Code"
                        sortable
                        body={(row) => (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {row.code}
                            </span>
                        )}
                    />

                    <Column
                        field="name"
                        header="Name"
                        sortable
                        body={(row) => (
                            <div className="font-medium text-gray-900">
                                {row.name}
                            </div>
                        )}
                    />

                    <Column
                        field="description"
                        header="Description"
                        body={(row) => (
                            <div className="text-gray-500 truncate max-w-md">
                                {row.description}
                            </div>
                        )}
                    />

                    <Column
                        header=""
                        body={(row) => (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <EllipsisVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => onEdit(row)}
                                        className="flex gap-2"
                                    >
                                        <PencilLineIcon className="w-4 h-4" />
                                        Edit
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() => onDelete(row)}
                                        className="flex gap-2 text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        bodyClassName="w-[60px]"
                    />
                </DataTable>
            </div>

            {/* PAGINATOR */}
            <div className="flex items-center justify-between px-4 py-3 bg-white ">
                <span className="text-sm text-gray-500">
                    {first + 1} - {Math.min(first + rows, totalRecords)} of{" "}
                    {totalRecords}
                </span>
                <Pagination className="w-auto mx-0">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationFirst
                                onClick={() => onPageChange({ page: 1 })}
                                aria-disabled={currentPage === 1}
                                className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => onPageChange({ page: Math.max(currentPage - 1, 1) })}
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
                                onClick={() => onPageChange({ page: Math.min(currentPage + 1, totalPages) })}
                                aria-disabled={currentPage === totalPages}
                                className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLast
                                onClick={() => onPageChange({ page: totalPages })}
                                aria-disabled={currentPage === totalPages}
                                className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>

            </div>
        </div>
    );
}
