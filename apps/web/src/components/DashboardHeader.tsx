"use client";

import { useState, useEffect } from "react";
import { LogOut, Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
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
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
        {/* Left Section - Logo BNI + GOV SALUR + Burger Button */}
        <div className="absolute left-0 top-0 h-16 flex items-center gap-4 px-5">
          {/* BNI Logo */}
          <div className="h-[25.481px] w-[86px] flex-shrink-0">
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 86 26"
            >
              {/* <g id="layer1">
                <g id="path176"></g>
                <path d={svgPaths.pe46a200} fill="#F15A22" id="path188" />
                <path d={svgPaths.p18551f00} fill="#F15A22" id="path192" />
                <path d={svgPaths.p3a2237f0} fill="#F15A22" id="path196" />
                <path d={svgPaths.p1cc03e80} fill="#F15A22" id="path200" />
                <path d={svgPaths.paab5400} fill="#F15A22" id="path212" />
                <path d={svgPaths.pb30200} fill="#F15A22" id="path216" />
                <path d={svgPaths.p21ee1c00} fill="#006885" id="path220" />
                <path d={svgPaths.p36e8c200} fill="#006885" id="path224" />
                <path d={svgPaths.p17fb1b00} fill="#006885" id="path228" />
              </g> */}
            </svg>
          </div>
          {/* Burger Button for Sidebar Toggle (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex text-[#717680] hover:bg-slate-100 rounded-lg p-2 transition-colors"
          >
            <Menu />
            {/* <svg
              className="block size-6"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 24 24"
            >
              <path d={svgPaths.p767f100} fill="#717680" /> */}
            {/* </svg> */}
          </button>
          {/* Mobile menu icon */}
          {/* <button
            onClick={onMenuClick}
            className="lg:hidden text-[#717680] hover:bg-slate-100 rounded-lg p-2 transition-colors"
          >
            <svg
              className="block size-6"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 24 24"
            >
              <path d={svgPaths.p767f100} fill="#717680" />
            </svg>
          </button> */}
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
