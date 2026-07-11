"use client";

import { useState, useEffect } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import type { AppNotificationInterface } from "@monorepo/types";
import { useApiService } from "@/hooks";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@monorepo/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@monorepo/ui/components/alert-dialog";
// import svgPaths from "../imports/svg-xedcjmpdg8";
import { type MasterUserInterface } from "@monorepo/types";

interface HeaderProps {
  onMenuClick: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  currentUser: MasterUserInterface | null;
  onLogout: () => void;
}

export function Header({
  onMenuClick,
  onToggleCollapse,
  isCollapsed,
  currentUser,
  onLogout,
}: HeaderProps) {
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [notifications, setNotifications] = useState<AppNotificationInterface[]>([]);
  const { callApi: loadNotifications } = useApiService("loadNotification");
  const { callApi: readNotification } = useApiService("readNotification");

  useEffect(() => {
    const load = () => loadNotifications({}, { onSuccess: (response) => setNotifications(response.data || []) });
    load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const openNotification = async (notification: AppNotificationInterface) => {
    if (!notification.is_read) {
      await readNotification({ id: notification.id }, {
        onSuccess: () => setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item)),
      });
    }
    if (notification.reference_url) router.push(notification.reference_url);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false);
    onLogout();
  };
  // Current date string computed on client only to avoid SSR/CSR mismatch
  const [currentDateStr, setCurrentDateStr] = useState<string>("");

  useEffect(() => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const now = new Date();
    setCurrentDateStr(
      `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
    );
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-30">
      {/* Main Navbar - Figma Design */}
      <div className="relative h-16">
        {/* Left Section */}
        <div className="absolute left-0 top-0 h-16 flex items-center gap-4 px-5">
          <Image
            src="/logo.png"
            alt="HomeHub"
            width={160}
            height={80}
            priority
            className="h-14 w-36 flex-shrink-0 object-contain"
          />
          {/* Burger Button for Sidebar Toggle (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex text-[#717680] hover:bg-slate-100 rounded-lg p-2 transition-colors"
          >
            <Menu />
          </button>
        </div>
        {/* Right Section - Date and User */}
        <div className="absolute right-0 top-0 h-16 flex items-center gap-3.5 px-6">
          {/* Date */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* <div className="size-6">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 24 24"
              >
                <path d={svgPaths.p3576c080} fill="#A4A7AE" />
              </svg>
            </div> */}
            <p className="font-medium text-[#181d27] text-[14px] whitespace-nowrap">
              {currentDateStr}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifikasi">
                <Bell className="h-5 w-5" />
                {notifications.some((item) => !item.is_read) ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /> : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white">
              <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
              {notifications.length === 0 ? <div className="px-3 py-6 text-center text-sm text-slate-500">Belum ada notifikasi</div> : notifications.slice(0, 8).map((notification) => (
                <DropdownMenuItem key={notification.id} className="cursor-pointer items-start py-3" onSelect={() => openNotification(notification)}>
                  <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${notification.is_read ? "bg-slate-200" : "bg-blue-600"}`} />
                  <span className="ml-2 min-w-0"><span className="block font-medium text-slate-800">{notification.title}</span><span className="mt-0.5 block whitespace-normal text-xs text-slate-500">{notification.message}</span></span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors">
                {/* <div className="bg-[#f7f7f7] rounded-2xl size-6 flex items-center justify-center">
                  <svg
                    className="block size-[18px]"
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 18 18"
                  >
                    <path
                      clipRule="evenodd"
                      d={svgPaths.p2b3df200}
                      fill="#A4A7AE"
                      fillRule="evenodd"
                    />
                    <path
                      clipRule="evenodd"
                      d={svgPaths.p35510680}
                      fill="#A4A7AE"
                      fillRule="evenodd"
                    />
                  </svg>
                </div> */}
                <p className="font-medium text-[#181d27] text-[14px] whitespace-nowrap">
                  {currentUser?.username || ""}
                </p>
                {/* <div className="size-6">
                  <svg
                    className="block size-full"
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 24 24"
                  >
                    <path d={svgPaths.p33a42b80} fill="#717680" />
                  </svg>
                </div> */}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-slate-900">
                    {currentUser?.username || ""}
                  </p>
                  <p className="text-slate-500">
                    {currentUser?.email || ""}
                  </p>

                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={handleLogoutClick}
                className="text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">
              Konfirmasi Keluar
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Apakah Anda yakin ingin keluar dari sistem? Anda perlu login
              kembali untuk mengakses dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Tidak
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header >
  );
}
