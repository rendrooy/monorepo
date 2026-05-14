import { Card, CardContent } from "@/components/ui/card";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
    PaginationLink,
    PaginationFirst,
    PaginationLast,
} from "@/components/ui/pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { MasterMemberInterface, Metadata } from "@monorepo/types";
import { useState } from "react";
import { Select2, Select2Content, Select2Item, Select2Trigger, Select2Value } from "@/components/ui/select2";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Eye, Loader2, PencilIcon, PencilLineIcon, PlusIcon, Trash, Trash2, Trash2Icon } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Loading from "@/components/Loading";

interface TableDataComponentProps {
    navigation: (navigate: string, dataItem?: MasterMemberInterface) => void;
    setPagination: (data: Metadata) => void
    listData: MasterMemberInterface[];
    isLoading: boolean
}

export function TableDataComponent({ listData, navigation, isLoading, setPagination }: TableDataComponentProps) {
    const [page, setPage] = useState(1);
    const totalPages = 5;

    return (
        <Card className="border-slate-200 shadow-sm mt-6">
            <CardContent className="p-6">
                <div className="overflow-x-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            navigation("CREATE")
                        }}
                    >
                        <PlusIcon />
                        Tambah Data
                    </Button>
                    {
                        isLoading ? (

                            <div className="p-6 flex flex-col items-center justify-center gap-2 h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
                        ) : (
                            <Table className={"mt-6"}>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-[60px] text-center">No</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>NIK</TableHead>
                                        <TableHead>Sex</TableHead>
                                        <TableHead>Profesi</TableHead>
                                        <TableHead className="text-center w-[120px]">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {listData?.length > 0 ? (
                                        listData.map((item, index) => (
                                            <TableRow key={item.id ?? index}>
                                                <TableCell className="text-center">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.nik}</TableCell>
                                                <TableCell>{item.sex}</TableCell>
                                                <TableCell>{item.profession ?? "-"}</TableCell>
                                                <TableCell className="text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost">
                                                                <EllipsisVertical />
                                                            </Button>
                                                        </DropdownMenuTrigger>

                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => navigation("UPDATE", item)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <PencilLineIcon className="w-4 h-4" />
                                                                Edit
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem
                                                                onClick={() => navigation("DETAIL", item)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Detail
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem
                                                                onClick={() => navigation("DELETE", item)}
                                                                className="flex items-center gap-2 text-red-500"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                                Hapus
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-center py-6 text-slate-500"
                                            >
                                                Tidak ada data
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )
                    }
                </div>

                <Pagination className="mt-6 flex items-center justify-between gap-2">

                    {/* PAGE SIZE */}
                    <div className="flex items-center gap-2">
                        <p>Menampilkan </p>
                        <Select2 className="border-slate-200 border-2"
                            searchable={false}
                        >
                            <Select2Trigger>
                                <Select2Value placeholder="5" />
                            </Select2Trigger>

                            <Select2Content>
                                <Select2Item value="10"
                                    onChange={(val) => {
                                    }}
                                >10</Select2Item>
                                <Select2Item value="25">25</Select2Item>
                                <Select2Item value="50">50</Select2Item>
                                <Select2Item value="100">100</Select2Item>
                            </Select2Content>
                        </Select2>
                        <p> data</p>
                    </div>

                    {/* PAGINATION */}
                    <PaginationContent className="flex items-center gap-1">

                        {/* FIRST */}
                        <PaginationItem>
                            <PaginationFirst onClick={() => setPage(1)} />
                        </PaginationItem>

                        {/* PREV */}
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            />
                        </PaginationItem>

                        {/* PAGE 1 */}
                        <PaginationItem>
                            <PaginationLink
                                isActive={page === 1}
                                onClick={() => setPage(1)}
                            >
                                1
                            </PaginationLink>
                        </PaginationItem>

                        {/* PAGE 2 */}
                        <PaginationItem>
                            <PaginationLink
                                isActive={page === 2}
                                onClick={() => setPage(2)}
                            >
                                2
                            </PaginationLink>
                        </PaginationItem>

                        {/* PAGE 3 */}
                        <PaginationItem>
                            <PaginationLink
                                isActive={page === 3}
                                onClick={() => setPage(3)}
                            >
                                3
                            </PaginationLink>
                        </PaginationItem>

                        {/* NEXT */}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() =>
                                    setPage((p) => Math.min(p + 1, totalPages))
                                }
                            />
                        </PaginationItem>

                        {/* LAST */}
                        <PaginationItem>
                            <PaginationLast
                                onClick={() => setPage(totalPages)}
                            />
                        </PaginationItem>

                    </PaginationContent>
                </Pagination>
            </CardContent>

        </Card>
    );
}