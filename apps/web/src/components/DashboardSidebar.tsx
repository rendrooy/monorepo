"use client";

import {
  ChevronDown,
  ChevronRight,
  Circle
} from "lucide-react";
import * as Icons from "lucide-react";
import { type ElementType, useEffect, useState } from "react";
import Link from "next/link";

interface SidebarProps {
  listMenu: any[];
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  activePage: string;
  onPageChange: (page: string) => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  url: string;
}

interface MenuItem {
  id: string;
  icon: keyof typeof Icons;
  label: string;
  url?: string;
  subItems: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    url: "dashboard",
    subItems: [],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: "UserCheck",
    url: "onboarding",
    subItems: [],
  },
  {
    id: "request",
    label: "Standing Instruction",
    icon: "FileText",
    subItems: [
      {
        id: "standing-instruction/request-penyaluran",
        label: "Request Penyaluran",
        url: "standing-instruction/request-penyaluran",
      },
    ],
  },
  {
    id: "report",
    label: "Monitoring",
    icon: "BarChart3",
    subItems: [
      {
        id: "monitoring/penyaluran",
        label: "Penyaluran",
        url: "monitoring/penyaluran",
      },
    ],
  },

  {
    id: "master",
    label: "Master",
    icon: 'Settings',
    subItems: [
      {
        id: "master/user",
        label: "Master User",
        url: "master/user",
      },
      {
        id: "master/member",
        label: "Master Member",
        url: "master/member",
      },
      {
        id: "master/role",
        label: "Master Role",
        url: "master/role",
      },
    ],
  },

  {
    id: "unduhan",
    label: "Unduhan",
    icon: "Download",
    url: "unduhan",
    subItems: [],
  },
  {
    id: "operation",
    label: "Operation",
    icon: "Settings",
    subItems: [
      {
        id: "operation/release",
        label: "Release",
        url: "operation/release",
      },
      {
        id: "operation/history-release",
        label: "History Release",
        url: "operation/history-release",
      },
    ],
  },
];

export function Sidebar({
  listMenu,
  isOpen,
  onClose,
  isCollapsed,
  activePage,
  onPageChange,
}: Readonly<SidebarProps>) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !isCollapsed || isHovered;
  // const [menuItems, setMenuItems] = useState<MenuItem[]>()

  const joinUrl = (parent?: string, child?: string) => {
    const p = parent?.replace(/\/$/, "") || "";
    const c = child?.replace(/^\//, "") || "";
    return `${p}/${c}`;
  };

  const mapMenu = (data: any[]): MenuItem[] => {
    const menuMap = new Map<string, MenuItem>();

    data.forEach((item) => {
      if (!menuMap.has(item.menuCode)) {
        menuMap.set(item.menuCode, {
          id: item.menuCode,
          icon: item.iconClass,
          label: item.menuName,
          url: item.pathUrl,
          subItems: [],
        });
      }
      const parent = menuMap.get(item.menuCode)!;

      if (item.child && item.child.length > 0) {
        const existingIds = new Set(parent.subItems.map((s) => s.id));

        item.child.forEach((child: any) => {
          if (!existingIds.has(child.menuCode)) {
            parent.subItems.push({
              id: child.menuCode,
              label: child.menuName,
              // 🔥 ini yang penting
              url: joinUrl(item.pathUrl, child.pathUrl),
            });
          }
        });
      }
    });

    return Array.from(menuMap.values());
  };

  // const menuItems = mapMenu(listMenu);


  // const menuItems =
  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId],
    );
  };

  const buildUrl = (url: string) =>
    url.startsWith("/") ? url : `/${url}`;
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white text-gray-900 border-r border-slate-200
          z-30 transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isExpanded ? "w-64" : "w-20"}
          ${isCollapsed && isHovered ? "shadow-2xl" : ""}
        `}
      >
        <div className="h-full flex flex-col">
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {

              // const IconLocal = Icons[item.icon as keyof typeof Icons] as ElementType;
              const IconLocal =
                Icons[item.icon as keyof typeof Icons] as ElementType ?? Circle;
              const hasSubItems = item.subItems.length > 0;
              const isMenuExpanded = expandedMenus.includes(item.id);
              const isActive =
                activePage === item.id ||
                item.subItems.some((sub) => sub.id === activePage);

              const shouldShowSubItems =
                isMenuExpanded ||
                (hasSubItems &&
                  item.subItems.some((sub) => sub.id === activePage));

              return (
                <div key={item.id}>
                  {/* MAIN ITEM */}
                  {hasSubItems ? (
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all
                        ${isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                        }
                        ${isExpanded ? "" : "justify-center"}
                        mb-1 relative group
                      `}
                      title={!isExpanded ? item.label : ""}
                    >
                      <IconLocal className="h-5 w-5 flex-shrink-0" />

                      {isExpanded && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {shouldShowSubItems ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </>
                      )}

                      {!isExpanded && !isHovered && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                          {item.label}
                        </div>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={buildUrl(item.url!)}
                      onClick={() => onPageChange(item.url!)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all
                        ${isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                        }
                        ${isExpanded ? "" : "justify-center"}
                        mb-1 relative group
                      `}
                      title={!isExpanded ? item.label : ""}
                    >
                      <IconLocal className="h-5 w-5 flex-shrink-0" />
                      {isExpanded && (
                        <span className="flex-1 text-left">{item.label}</span>
                      )}
                    </Link>
                  )}

                  {/* SUB ITEMS */}
                  {hasSubItems && shouldShowSubItems && isExpanded && (
                    <div className="ml-4 space-y-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = activePage === sub.id;

                        return (
                          <Link
                            key={sub.id}
                            href={buildUrl(sub.url)}
                            onClick={() => onPageChange(sub.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                              ${isSubActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:bg-slate-50"
                              }
                            `}
                          >
                            <Circle
                              className="h-3 w-3 flex-shrink-0"
                              fill="currentColor"
                            />
                            <span className="flex-1">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* USER SECTION */}
          {/* <div className="px-3 py-4 border-t border-slate-200">
            <div
              className={`flex items-center gap-3 px-3 py-2 ${
                isExpanded ? "" : "justify-center"
              }`}
            >
              <div className="size-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm text-white flex-shrink-0">
                JD
              </div>
              {isExpanded && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    John Doe
                  </p>
                  <p className="text-xs text-slate-500 whitespace-nowrap">
                    Online
                  </p>
                </div>
              )}
            </div>
          </div> */}
        </div>
      </aside>
    </>
  );
}