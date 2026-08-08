"use client";

import type {
  MasterMenuInterface,
  MasterRoleInterface,
  MasterRoleMenuPermissionInterface,
  Metadata,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Checkbox } from "@monorepo/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ConfirmationDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { PlatformStatusBadge } from "@/components/PlatformStatusBadge";
import { platformApi } from "@/services/platform-api";
import { RolePermissionMatrix } from "@/app/(pages)/master/role/components/RolePermissionMatrix";

const emptyRole: MasterRoleInterface = {
  code: "",
  desc: "",
  is_active: true,
  name: "",
  role_permissions: [],
};

const emptyMenu: MasterMenuInterface = {
  code: "",
  icon: "",
  is_active: true,
  menu_level: 1,
  name: "",
  parent_id: null,
  path_url: "",
  sort_order: 0,
};

export default function PlatformAccessPage() {
  const [view, setView] = useState<"menus" | "roles">("roles");
  const [roles, setRoles] = useState<MasterRoleInterface[]>([]);
  const [menus, setMenus] = useState<MasterMenuInterface[]>([]);
  const [menuCatalog, setMenuCatalog] = useState<MasterMenuInterface[]>([]);
  const [roleMeta, setRoleMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [menuMeta, setMenuMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [roleForm, setRoleForm] = useState<MasterRoleInterface | null>(null);
  const [menuForm, setMenuForm] = useState<MasterMenuInterface | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; type: "menu" | "role" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    const response = await platformApi<MasterRoleInterface[]>("/platform/access/role/load", {
      metadata: roleMeta,
      params: keyword ? { name: keyword } : {},
    });
    setRoles(response.data || []);
    setRoleMeta((current) => ({ ...current, total: response.metaData?.total || 0 }));
  }, [keyword, roleMeta.page, roleMeta.pageSize, roleMeta.sortBy, roleMeta.sortDir]);

  const loadMenus = useCallback(async () => {
    const response = await platformApi<MasterMenuInterface[]>("/platform/access/menu/load", {
      metadata: menuMeta,
      params: keyword ? { name: keyword } : {},
    });
    setMenus(response.data || []);
    setMenuMeta((current) => ({ ...current, total: response.metaData?.total || 0 }));
  }, [keyword, menuMeta.page, menuMeta.pageSize, menuMeta.sortBy, menuMeta.sortDir]);

  const loadMenuCatalog = useCallback(async () => {
    const response = await platformApi<MasterMenuInterface[]>("/platform/access/menu/load", {
      metadata: { page: 1, pageSize: 1000, sortBy: "sort_order", sortDir: "ASC" },
      params: { is_active: true },
    });
    setMenuCatalog(response.data || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([view === "roles" ? loadRoles() : loadMenus(), loadMenuCatalog()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data akses gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, [loadMenuCatalog, loadMenus, loadRoles, view]);

  useEffect(() => { refresh(); }, [refresh]);

  const permissionMenus = useMemo(
    () => menuCatalog.filter((menu) => !["master/role", "master/menu"].includes(
      (menu.path_url || "").replace(/^\/+|\/+$/g, "").toLowerCase(),
    )),
    [menuCatalog],
  );

  const openRole = async (role?: MasterRoleInterface) => {
    if (!role?.id) {
      setRoleForm({ ...emptyRole, role_permissions: [] });
      return;
    }
    try {
      const response = await platformApi<MasterRoleInterface>("/platform/access/role/get", { id: role.id });
      setRoleForm(response.data || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role gagal dimuat");
    }
  };

  const saveRole = async () => {
    if (!roleForm?.name?.trim() || !roleForm.code?.trim()) return;
    setSaving(true);
    try {
      const path = roleForm.id ? "/platform/access/role/update" : "/platform/access/role/create";
      await platformApi(path, roleForm);
      toast.success(`Role berhasil di${roleForm.id ? "perbarui" : "buat"}`);
      setRoleForm(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Role gagal disimpan");
    } finally {
      setSaving(false);
    }
  };

  const openMenu = async (menu?: MasterMenuInterface) => {
    if (!menu?.id) {
      setMenuForm({ ...emptyMenu });
      return;
    }
    try {
      const response = await platformApi<MasterMenuInterface>("/platform/access/menu/get", { id: menu.id });
      setMenuForm(response.data || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Menu gagal dimuat");
    }
  };

  const saveMenu = async () => {
    if (!menuForm?.name?.trim() || !menuForm.code?.trim() || !menuForm.path_url?.trim()) return;
    setSaving(true);
    try {
      const path = menuForm.id ? "/platform/access/menu/update" : "/platform/access/menu/create";
      await platformApi(path, {
        ...menuForm,
        menu_level: Number(menuForm.menu_level || 1),
        parent_id: Number(menuForm.menu_level || 1) > 1 ? menuForm.parent_id || null : null,
        sort_order: Number(menuForm.sort_order || 0),
      });
      toast.success(`Menu berhasil di${menuForm.id ? "perbarui" : "buat"}`);
      setMenuForm(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Menu gagal disimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await platformApi(`/platform/access/${deleteTarget.type}/delete`, { id: deleteTarget.id });
      toast.success(`${deleteTarget.type === "role" ? "Role" : "Menu"} berhasil dihapus`);
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data gagal dihapus");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div className="border-b border-slate-200 pb-5"><h1 className="text-2xl font-semibold text-slate-900">Akses Tenant</h1><p className="mt-1 text-sm text-slate-500">Kelola template role, menu, dan permission global seluruh tenant.</p></div>
    <div className="flex border-b border-slate-200" role="tablist"><button className={`border-b-2 px-4 py-3 text-sm font-medium ${view === "roles" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`} onClick={() => { setKeyword(""); setView("roles"); }} role="tab">Role</button><button className={`border-b-2 px-4 py-3 text-sm font-medium ${view === "menus" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`} onClick={() => { setKeyword(""); setView("menus"); }} role="tab">Menu</button></div>
    <Card><CardContent className="pt-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder={`Cari nama ${view === "roles" ? "role" : "menu"}`} value={keyword} onChange={(event) => { setKeyword(event.target.value); view === "roles" ? setRoleMeta((meta) => ({ ...meta, page: 1 })) : setMenuMeta((meta) => ({ ...meta, page: 1 })); }} /></div><Button onClick={() => view === "roles" ? openRole() : openMenu()}><Plus className="h-4 w-4" />{view === "roles" ? "Role Baru" : "Menu Baru"}</Button></div>{view === "roles" ? <AppDataTable data={roles} loading={loading} meta={roleMeta} onMetaChange={setRoleMeta} columns={[{ field: "code", header: "Kode", sortable: true },{ field: "name", header: "Nama", sortable: true },{ field: "desc", header: "Deskripsi", body: (row) => row.desc || "-" },{ field: "is_active", header: "Status", body: (row) => <PlatformStatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} /> },{ header: "Aksi", body: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Edit role" onClick={() => openRole(row)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Hapus role" onClick={() => setDeleteTarget({ id: row.id || "", label: row.name || "role", type: "role" })}><Trash2 className="h-4 w-4 text-red-600" /></Button></div> }]} /> : <AppDataTable data={menus} loading={loading} meta={menuMeta} onMetaChange={setMenuMeta} columns={[{ field: "code", header: "Kode", sortable: true },{ field: "name", header: "Nama", sortable: true },{ field: "path_url", header: "Path" },{ field: "menu_level", header: "Level", sortable: true },{ field: "sort_order", header: "Urutan", sortable: true },{ field: "is_active", header: "Status", body: (row) => <PlatformStatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} /> },{ header: "Aksi", body: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Edit menu" onClick={() => openMenu(row)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Hapus menu" onClick={() => setDeleteTarget({ id: row.id || "", label: row.name || "menu", type: "menu" })}><Trash2 className="h-4 w-4 text-red-600" /></Button></div> }]} />}</CardContent></Card>

    <Dialog open={Boolean(roleForm)} onOpenChange={(open) => !open && setRoleForm(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{roleForm?.id ? "Edit Role" : "Role Baru"}</DialogTitle><DialogDescription>Permission ini menjadi template global dan berlaku untuk seluruh tenant.</DialogDescription></DialogHeader>{roleForm ? <div className="space-y-5 py-2"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Nama Role</Label><Input value={roleForm.name || ""} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} /></div><div className="space-y-2"><Label>Kode Role</Label><Input value={roleForm.code || ""} onChange={(event) => setRoleForm({ ...roleForm, code: event.target.value.toUpperCase() })} /></div><div className="space-y-2 sm:col-span-2"><Label>Deskripsi</Label><Input value={roleForm.desc || ""} onChange={(event) => setRoleForm({ ...roleForm, desc: event.target.value })} /></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={roleForm.is_active ?? true} onCheckedChange={(checked) => setRoleForm({ ...roleForm, is_active: checked === true })} />Role aktif</label></div><RolePermissionMatrix menus={permissionMenus} loadingMenus={loading} permissions={roleForm.role_permissions || []} onChange={(permissions: MasterRoleMenuPermissionInterface[]) => setRoleForm((current) => current ? { ...current, role_permissions: permissions } : current)} /></div> : null}<DialogFooter><Button variant="outline" onClick={() => setRoleForm(null)}>Batal</Button><Button disabled={saving || !roleForm?.name?.trim() || !roleForm.code?.trim()} onClick={saveRole}>{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(menuForm)} onOpenChange={(open) => !open && setMenuForm(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{menuForm?.id ? "Edit Menu" : "Menu Baru"}</DialogTitle><DialogDescription>Struktur menu ini digunakan oleh seluruh tenant.</DialogDescription></DialogHeader>{menuForm ? <div className="grid gap-4 py-2 sm:grid-cols-2"><div className="space-y-2"><Label>Nama Menu</Label><Input value={menuForm.name || ""} onChange={(event) => setMenuForm({ ...menuForm, name: event.target.value })} /></div><div className="space-y-2"><Label>Kode Menu</Label><Input inputMode="numeric" maxLength={4} value={menuForm.code || ""} onChange={(event) => setMenuForm({ ...menuForm, code: event.target.value.replace(/\D/g, "") })} /></div><div className="space-y-2"><Label>Path URL</Label><Input value={menuForm.path_url || ""} onChange={(event) => setMenuForm({ ...menuForm, path_url: event.target.value })} /></div><div className="space-y-2"><Label>Icon</Label><Input value={menuForm.icon || ""} onChange={(event) => setMenuForm({ ...menuForm, icon: event.target.value })} /></div><div className="space-y-2"><Label>Level</Label><select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={menuForm.menu_level || 1} onChange={(event) => setMenuForm({ ...menuForm, menu_level: Number(event.target.value), parent_id: null })}><option value={1}>Level 1</option><option value={2}>Level 2</option><option value={3}>Level 3</option></select></div><div className="space-y-2"><Label>Parent Menu</Label><select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50" disabled={Number(menuForm.menu_level || 1) <= 1} value={menuForm.parent_id || ""} onChange={(event) => setMenuForm({ ...menuForm, parent_id: event.target.value || null })}><option value="">Pilih parent</option>{menuCatalog.filter((menu) => menu.id !== menuForm.id && Number(menu.menu_level) === Number(menuForm.menu_level || 1) - 1).map((menu) => <option key={menu.id || ""} value={menu.id || ""}>{menu.code} · {menu.name}</option>)}</select></div><div className="space-y-2"><Label>Urutan</Label><Input type="number" min={0} value={menuForm.sort_order || 0} onChange={(event) => setMenuForm({ ...menuForm, sort_order: Number(event.target.value) })} /></div><label className="flex items-end gap-2 pb-2 text-sm"><Checkbox checked={menuForm.is_active ?? true} onCheckedChange={(checked) => setMenuForm({ ...menuForm, is_active: checked === true })} />Menu aktif</label></div> : null}<DialogFooter><Button variant="outline" onClick={() => setMenuForm(null)}>Batal</Button><Button disabled={saving || !menuForm?.name?.trim() || !/^\d{4}$/.test(menuForm.code || "") || !menuForm.path_url?.trim() || (Number(menuForm.menu_level || 1) > 1 && !menuForm.parent_id)} onClick={saveMenu}>{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></DialogContent></Dialog>

    <ConfirmationDialog open={Boolean(deleteTarget)} isLoading={saving} variant="warning" title={`Hapus ${deleteTarget?.type === "role" ? "role" : "menu"}?`} message={`${deleteTarget?.label || "Data"} akan dihapus dari template global seluruh tenant.`} confirmText="Hapus" onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
  </div>;
}
