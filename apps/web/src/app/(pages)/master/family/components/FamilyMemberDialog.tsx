"use client";

import { SharedDropdown, type SharedDropdownOption } from "@/components/SharedDropdown";
import { Button } from "@monorepo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@monorepo/ui/components/dialog";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type SelectedFamilyMember = SharedDropdownOption & {
    family_relation?: string;
    family_relation_label?: string;
    nik?: string | null;
};

type FamilyMemberDialogProps = {
    familyRelationOptions: SharedDropdownOption[];
    loadingFamilyRelation?: boolean;
    loadingMember?: boolean;
    memberOptions: SharedDropdownOption[];
    onAddMember: (member: SelectedFamilyMember) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    selectedMembers: SelectedFamilyMember[];
};

export function FamilyMemberDialog({
    familyRelationOptions,
    loadingFamilyRelation = false,
    loadingMember = false,
    memberOptions,
    onAddMember,
    onOpenChange,
    open,
    selectedMembers,
}: FamilyMemberDialogProps) {
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [selectedFamilyRelation, setSelectedFamilyRelation] = useState("");

    const availableMemberOptions = memberOptions.filter(
        (option) => !selectedMembers.some((member) => member.id === option.id),
    );

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            if (nextOpen) {
                setSelectedMemberId("");
                setSelectedFamilyRelation("");
            }
            onOpenChange(nextOpen);
        },
        [onOpenChange],
    );

    const handleAddMember = useCallback(() => {
        const selectedMember = memberOptions.find((item) => item.id === selectedMemberId);
        if (!selectedMember) {
            toast.error("Pilih member terlebih dahulu");
            return;
        }

        const selectedRelation = familyRelationOptions.find(
            (item) => item.id === selectedFamilyRelation,
        );
        if (!selectedRelation) {
            toast.error("Pilih hubungan keluarga terlebih dahulu");
            return;
        }

        if (selectedMembers.some((item) => item.id === selectedMember.id)) {
            toast.error("Member sudah ada di list");
            return;
        }

        onAddMember({
            ...selectedMember,
            family_relation: selectedRelation.id,
            family_relation_label: selectedRelation.label,
        });
        onOpenChange(false);
    }, [
        familyRelationOptions,
        memberOptions,
        onAddMember,
        onOpenChange,
        selectedFamilyRelation,
        selectedMemberId,
        selectedMembers,
    ]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Anggota</DialogTitle>
                    <DialogDescription>
                        Pilih member yang belum terhubung dengan data family.
                    </DialogDescription>
                </DialogHeader>

                <SharedDropdown
                    clearable
                    searchable
                    id="member_id_dialog"
                    label="Member"
                    loading={loadingMember}
                    options={availableMemberOptions}
                    placeholder="Pilih member"
                    value={selectedMemberId}
                    onValueChange={setSelectedMemberId}
                />

                <SharedDropdown
                    clearable
                    id="family_relation_dialog"
                    label="Hubungan Keluarga"
                    loading={loadingFamilyRelation}
                    options={familyRelationOptions}
                    placeholder="Pilih hubungan keluarga"
                    value={selectedFamilyRelation}
                    onValueChange={setSelectedFamilyRelation}
                />

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Batal
                    </Button>
                    <Button type="button" onClick={handleAddMember}>
                        Tambah
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
