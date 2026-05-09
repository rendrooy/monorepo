"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
// import { type UserLoginData } from "@/types/Auth/Login";
// import { useSession, signOut } from "next-auth/react";
import { Header } from "../../components/DashboardHeader";
import { Sidebar } from "../../components/DashboardSidebar";
import { DashboardBreadcrumbs } from "../../components/DashboardBreadcrumb";
import { usePathname, useRouter } from "next/navigation";
import type { MasterUserInterface } from "@monorepo/types";
// import { getCookie, setCookie, removeCookie } from "@/utils/CookieUtils";

interface LayoutClientProps {
    children: ReactNode;
    currentUser: MasterUserInterface | null;
    frontendTTL?: string;
}

export default function LayoutClient({ children, currentUser, frontendTTL }: Readonly<LayoutClientProps>) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // const { data: session, status } = useSession();
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoggingOutRef = useRef(false);

    const router = useRouter();
    const pathname = usePathname();

    const segments = pathname.split("/").filter(Boolean);

    const activePage =
        segments.length >= 2
            ? `${segments[0]}/${segments[1]}`
            : (segments[0] ?? "dashboard");
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");

        return {
            label: segment
                .replaceAll(/-/g, " ")
                .replaceAll(/\b\w/g, (c) => c.toUpperCase()),
            href: index === 1 ? href : "#",
        };
    });

    const onPageChange = (page: string) => {
        router.push(`/${page}`);
    };

    const handleLogout = useCallback(async () => {
        isLoggingOutRef.current = true;
        try {
            navigator.sendBeacon("/api/logout");
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            // removeCookie("active_tabs_count");
            // removeCookie("tab_logout_pending");

            // await signOut({ redirect: true, callbackUrl: "/login" });
        }
    }, []);

    // useEffect(() => {
    //     if (status === "loading") return;

    //     const TAB_UNLOADING_KEY = "tab_unloading";
    //     const LOGOUT_PENDING_KEY = "tab_logout_pending";

    //     const logoutPendingRaw = getCookie(LOGOUT_PENDING_KEY);
    //     if (logoutPendingRaw) {
    //         removeCookie(LOGOUT_PENDING_KEY);

    //         if (status === "authenticated") {
    //             const unloadingTabId = sessionStorage.getItem(TAB_UNLOADING_KEY);
    //             sessionStorage.removeItem(TAB_UNLOADING_KEY);
    //             const { tabId: pendingTabId } = JSON.parse(logoutPendingRaw) as { tabId: string };

    //             if (unloadingTabId !== pendingTabId) {
    //                 handleLogout();
    //                 return;
    //             }
    //         }
    //     }
    // }, [status, handleLogout]);

    // useEffect(() => {
    //     const TAB_REGISTRY_KEY = "active_tab_registry";
    //     const TAB_ID_KEY = "this_tab_id";
    //     const TAB_UNLOADING_KEY = "tab_unloading";
    //     const LOGOUT_PENDING_KEY = "tab_logout_pending";

    //     let tabId = sessionStorage.getItem(TAB_ID_KEY);
    //     if (!tabId) {
    //         tabId = crypto.randomUUID();
    //         sessionStorage.setItem(TAB_ID_KEY, tabId);
    //     }

    //     const existingRegistry: string[] = JSON.parse(getCookie(TAB_REGISTRY_KEY) || "[]");
    //     if (!existingRegistry.includes(tabId)) {
    //         existingRegistry.push(tabId);
    //         setCookie(TAB_REGISTRY_KEY, JSON.stringify(existingRegistry));
    //     }

    //     const channel = new BroadcastChannel("tab_registry_sync");

    //     channel.onmessage = (event: MessageEvent) => {
    //         if (event.data?.type === "ping") {
    //             channel.postMessage({ type: "pong", tabId });
    //         }
    //     };

    //     const cleanupStaleEntries = () => {
    //         channel.postMessage({ type: "ping" });
    //         const aliveTabs = new Set<string>([tabId]);

    //         const collectPongs = (event: MessageEvent) => {
    //             if (event.data?.type === "pong" && event.data.tabId) {
    //                 aliveTabs.add(event.data.tabId as string);
    //             }
    //         };
    //         channel.addEventListener("message", collectPongs);

    //         setTimeout(() => {
    //             channel.removeEventListener("message", collectPongs);
    //             const registry: string[] = JSON.parse(getCookie(TAB_REGISTRY_KEY) || "[]");
    //             const cleanRegistry = registry.filter(aliveTabs.has.bind(aliveTabs));
    //             // Safety net: always keep the current tab even if it was pruned by a race condition.
    //             if (!cleanRegistry.includes(tabId)) {
    //                 cleanRegistry.push(tabId);
    //             }
    //             setCookie(TAB_REGISTRY_KEY, JSON.stringify(cleanRegistry));
    //         }, 150);
    //     };

    //     cleanupStaleEntries();

    //     const handleTabClose = () => {
    //         const currentTabId = sessionStorage.getItem(TAB_ID_KEY);
    //         if (!currentTabId) return;

    //         sessionStorage.setItem(TAB_UNLOADING_KEY, currentTabId);

    //         const registry: string[] = JSON.parse(getCookie(TAB_REGISTRY_KEY) || "[]");
    //         const newRegistry = registry.filter((id) => id !== currentTabId);

    //         if (newRegistry.length === 0) {
    //             removeCookie(TAB_REGISTRY_KEY);
    //             if (!isLoggingOutRef.current) {
    //                 setCookie(LOGOUT_PENDING_KEY, JSON.stringify({ tabId: currentTabId }));
    //             }
    //         } else {
    //             setCookie(TAB_REGISTRY_KEY, JSON.stringify(newRegistry));
    //         }
    //     };

    //     window.addEventListener("beforeunload", handleTabClose);

    //     return () => {
    //         window.removeEventListener("beforeunload", handleTabClose);
    //         channel.close();
    //     };
    // }, [handleLogout]);

    // useEffect(() => {
    //     if (
    //         status === "unauthenticated" ||
    //         (status === "authenticated" && !session?.isAuthorized)
    //     ) {
    //         router.push("/login");
    //     }
    // }, [status, session, router]);

    // useEffect(() => {
    //     if (status !== "authenticated" || !session?.isAuthorized) return;

    //     const idleTimeoutMs =
    //         Number(frontendTTL) || 900_000;

    //     const resetIdleTimer = () => {
    //         if (idleTimerRef.current !== null) {
    //             globalThis.clearTimeout(idleTimerRef.current);
    //         }

    //         idleTimerRef.current = globalThis.setTimeout(() => {
    //             if (isLoggingOutRef.current) return;
    //             isLoggingOutRef.current = true;
    //             handleLogout();
    //         }, idleTimeoutMs);
    //     };

    //     resetIdleTimer();

    //     const activityEvents = [
    //         "pointermove",
    //         "keydown",
    //         "scroll",
    //         "click",
    //         "touchstart",
    //     ] as const;

    //     activityEvents.forEach((eventName) => {
    //         globalThis.addEventListener(eventName, resetIdleTimer, { passive: true });
    //     });

    //     return () => {
    //         if (idleTimerRef.current !== null) {
    //             globalThis.clearTimeout(idleTimerRef.current);
    //         }

    //         activityEvents.forEach((eventName) => {
    //             globalThis.removeEventListener(eventName, resetIdleTimer);
    //         });
    //     };
    // }, [status, session, handleLogout, frontendTTL]);

    // if (
    //     status === "loading" ||
    //     status === "unauthenticated" ||
    //     (status === "authenticated" && !session?.isAuthorized)
    // ) {
    //     return null;
    // }

    return (
        <div className="flex">
            <Header
                onMenuClick={() => setSidebarOpen(true)}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                isCollapsed={sidebarCollapsed}
                currentUser={currentUser}
                onLogout={handleLogout}
            />

            <Sidebar
                listMenu={[]}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                activePage={activePage}
                onPageChange={(val) => {
                    onPageChange(val);
                }}
            />

            <div
                className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"}`}
            ></div>

            <div className="flex-1 min-w-0 pt-16">
                <main className="h-full bg-gray-50">
                    <div className="px-6 py-4">
                        <DashboardBreadcrumbs items={breadcrumbs} />
                        <div className="min-h-screen">{children}</div>
                    </div>
                </main>
                <footer className="text-center py-4 text-sm">
                    BNI berizin dan diawasi oleh Otoritas Jasa Keuangan & Bank Indonesia | BNI merupakan peserta penjamin LPS | bni.co.id | BNI Call 1500046
                </footer>
            </div>
        </div>
    );
}