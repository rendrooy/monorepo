"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import type { BaseRequest, BaseResponse, MasterMemberInterface, MasterUserInterface } from "@monorepo/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { SharedDropdown } from "@/components/SharedDropdown";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
// import { TableDataComponent } from "@/app/(pages)/master/user/list/_components/tableDataComponent";
import { useRouter } from 'next/navigation'
import { Router } from "next/router";
import { useApiService } from "@/hooks/useApiService";
import { request } from "http";
import { TableDataComponent } from "./_components/tableDataComponent";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";



function FilterDataComponent({
    onFilter,
}: {
    onFilter: (data: Partial<MasterMemberInterface>) => void;
}) {
    const formik = useFormik<MasterMemberInterface>({
        initialValues: {
            name: "",
            nik: "",
            sex: ""
        },
        onSubmit: (values) => {
            onFilter(values);
        },
    });

    return (
        <form onSubmit={formik.handleSubmit} className="mt-6">
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                    {/* HEADER COLLAPSE */}
                    <Collapsible>
                        <CollapsibleTrigger className="flex w-full items-center justify-between">
                            <p className="font-medium">Cari Data Warga</p>
                            <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>

                        <CollapsibleContent className="pt-6 space-y-6">

                            {/* GRID 3 HORIZONTAL */}
                            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">

                                <div>
                                    <Label>Username</Label>
                                    <Input
                                        className="w-full mt-2 border-slate-200 bg-white"
                                        name="name"
                                        value={formik.values.name ?? ""}
                                        onChange={formik.handleChange}
                                        placeholder="Masukkan Nama Warga"
                                    />
                                </div>

                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        className="w-full mt-2 border-slate-200 bg-white"
                                        name="nik"
                                        value={formik.values.nik ?? ""}
                                        onChange={formik.handleChange}
                                        placeholder="Masukkan NIK"
                                    />
                                </div>

                                <div>
                                    <Label>Role</Label>
                                    <SharedDropdown
                                        id={"sex"}
                                        className="w-full mt-2 border-slate-200 bg-white"
                                        placeholder={"Pilih Jenis Kelamin"}
                                        onValueChange={(value) => {
                                            formik.setFieldValue("sex", value)
                                            formik.setFieldTouched("sex")
                                        }}
                                        value={formik.values.sex ?? ""}
                                        options={[
                                            {
                                                id: "MALE",
                                                label: "Male"
                                            },
                                            {
                                                id: "FEMALE",
                                                label: "Female"
                                            },
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* BUTTON */}
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="submit"
                                    variant="default"
                                    onClick={() => {

                                    }}
                                >
                                    Cari
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => formik.resetForm()}
                                >
                                    Bersihkan
                                </Button>
                            </div>

                        </CollapsibleContent>
                    </Collapsible>

                </CardContent>
            </Card>
        </form>
    );
}

export default function PageContent() {
    const router = useRouter()
    const [listData, setListData] = useState<MasterMemberInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const { callApi: callMemberDataList, loading: loadingMemberDataList } = useApiService("loadDataMember")
    const { callApi: callDeleteMember, loading: loadinDeleteMember } = useApiService("deleteDataMember")
    const [selectedItem, setSelectedItem] = useState<MasterMemberInterface>()
    const [dataRequest, setDataRequest] = useState<BaseRequest<MasterMemberInterface>>({
        metadata: {
            page: 1,
            pageSize: 10
        }
    })

    const handleGetlist = useCallback(
        async (
            request: BaseRequest
        ) => {
            try {
                await callMemberDataList(
                    {
                        params: {
                            ...request.params
                        },
                        metadata: {
                            ...request.metadata
                        }
                    },
                    {
                        onSuccess(response) {
                            // console.info("response", response);
                            const data = response.data as MasterMemberInterface[]
                            setListData(data)
                        },
                        onError(error) {
                            console.info("error", error)
                        },
                    }
                )
            } catch (error) {

            }
        }, []
    )

    function HandleNavigation(Type: string, item: MasterMemberInterface | null) {
        setSelectedItem(item!)
        if (Type === "CREATE") {
            router.push("../master/member/create");
        } else if (Type === "DELETE") {
            setIsDialogOpen(true)
        } else if (Type === "UPDATE") {
            router.push(`../master/member/edit/${item?.id}`);

        } else if (Type === "DETAIL") {
            router.push(`../master/member/view/${item?.id}`);

        }

    }

    const handleDelete = useCallback(
        async (
            request: string
        ) => {
            try {
                await callDeleteMember(
                    {
                        id: request
                    },
                    {
                        onSuccess(response: BaseResponse) {
                            setIsDialogOpen(false)
                            toast.success(response.message)
                            handleGetlist(dataRequest)
                        },
                        onError(error) {
                            console.info("error", error)
                        },
                    }
                )
            } catch (error) {

            }
        }, []
    )

    useEffect(() => {
        handleGetlist(dataRequest);
    }, [dataRequest])

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Member Management</h1>
                    <p className="text-gray-600">
                        Di halaman ini, Anda dapat mengelola warga master Anda. Fitur ini masih dalam pengembangan, jadi tetap nantikan pembaruan selanjutnya!
                    </p>
                </CardContent>
            </Card>
            <FilterDataComponent
                onFilter={(value: MasterMemberInterface) => {
                    setDataRequest((prev) => ({
                        ...prev,
                        params: value
                    }))
                }}
            />
            <TableDataComponent
                isLoading={loadingMemberDataList}
                navigation={(navigate, dataItem) => {
                    HandleNavigation(navigate, dataItem ?? null)
                }}
                listData={listData} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>``
                        Konfirmasi
                    </DialogHeader>
                    <DialogDescription>
                        Yakin Menghapus data {selectedItem?.name}
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false)
                            }}
                        >
                            Cancel
                        </Button><Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                handleDelete(selectedItem?.id ?? "")
                            }}
                        >
                            Konfirmasi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
