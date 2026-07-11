"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
// import { type UserLoginData } from "@/types/Auth/Login";
// import { useSession, signOut } from "next-auth/react";
import { Header } from "../../components/DashboardHeader";
import { Sidebar } from "../../components/DashboardSidebar";
import { DashboardBreadcrumbs } from "../../components/DashboardBreadcrumb";
import { usePathname, useRouter } from "next/navigation";
import type { AuthMenuTreeInterface, AuthUserInterface, BaseResponse, MasterUserInterface } from "@monorepo/types";
import { PrimeReactProvider } from "primereact/api";
import { AUTH_SESSION_CLEARED_EVENT, clearAuthSession, getAccessToken, getAuthMenu, getAuthUser, setAuthMenu, setAuthUser } from "@/utils/auth-storage";
import { useApiService } from "@/hooks";
import { canAccessRoute, type PermissionAction } from "@/utils/permission";
// import { getCookie, setCookie, removeCookie } from "@/utils/CookieUtils";

const getRoutePermissionAction = (segments: string[]): PermissionAction => {
    if (segments.includes("create")) {
        return "ADD";
    }

    if (segments.includes("edit")) {
        return "EDIT";
    }

    return "READ";
};

interface LayoutClientProps {
    children: ReactNode;
    currentUser: MasterUserInterface | null;
    frontendTTL?: string;
}

function AccessLoadingState({ label }: Readonly<{ label: string }>) {
    return (
        <PrimeReactProvider value={{ ripple: true }}>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                    <span>{label}</span>
                </div>
            </div>
        </PrimeReactProvider>
    );
}

export default function LayoutClient({ children, currentUser, frontendTTL }: Readonly<LayoutClientProps>) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sessionUser, setSessionUser] = useState<MasterUserInterface | null>(currentUser);
    const [sessionMenu, setSessionMenu] = useState<AuthMenuTreeInterface[]>([]);
    const [menuResolved, setMenuResolved] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    // const { data: session, status } = useSession();
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoggingOutRef = useRef(false);

    const router = useRouter();
    const pathname = usePathname();
    const { callApi: callMe } = useApiService("meAuth");
    const { callApi: callMenu } = useApiService("menuAuth");

    const segments = pathname.split("/").filter(Boolean);

    const activePage = segments.join("/") || "dashboard";
    const requiredAction = getRoutePermissionAction(segments);
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");

        return {
            label: segment
                .replaceAll(/-/g, " ")
                .replaceAll(/\b\w/g, (c) => c.toUpperCase()),
            href: index === 1 ? href : "#",
        };
    });

    const canAccessCurrentRoute = useMemo(
        () => sessionMenu.length > 0 && canAccessRoute(sessionMenu, activePage, requiredAction),
        [activePage, requiredAction, sessionMenu],
    );

    const onPageChange = (page: string) => {
        router.push(`/${page}`);
    };

    const handleLogout = useCallback(async () => {
        isLoggingOutRef.current = true;
        try {
            clearAuthSession();
            router.replace("/login");
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            // removeCookie("active_tabs_count");
            // removeCookie("tab_logout_pending");

            // await signOut({ redirect: true, callbackUrl: "/login" });
        }
    }, [router]);

    useEffect(() => {
        const token = getAccessToken();

        if (!token) {
            router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
            return;
        }

        const storedMenu = getAuthMenu();
        setSessionUser(getAuthUser());
        setSessionMenu(storedMenu);
        setMenuResolved(storedMenu.length > 0);
        setCheckingSession(false);

        const refreshSession = async () => {
            await Promise.all([
                callMe(
                    {},
                    {
                        onSuccess(response: BaseResponse<AuthUserInterface | null>) {
                            if (response.data) {
                                setAuthUser(response.data);
                                setSessionUser(response.data);
                            }
                        },
                    },
                ),
                callMenu(
                    {},
                    {
                        onSuccess(response: BaseResponse<AuthMenuTreeInterface[]>) {
                            const menu = response.data ?? [];
                            setAuthMenu(menu);
                            setSessionMenu(menu);
                            setMenuResolved(true);
                        },
                    },
                ),
            ]);
        };

        refreshSession();
    }, [callMe, callMenu, pathname, router]);

    useEffect(() => {
        const handleSessionCleared = () => {
            router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        };

        window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);

        return () => {
            window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
        };
    }, [pathname, router]);

    useEffect(() => {
        if (checkingSession || !menuResolved) {
            return;
        }

        if (!canAccessCurrentRoute) {
            router.replace("/403");
        }
    }, [canAccessCurrentRoute, checkingSession, menuResolved, router]);

    if (checkingSession || !menuResolved) {
        return <AccessLoadingState label="Memeriksa akses..." />;
    }

    if (!canAccessCurrentRoute) {
        return <AccessLoadingState label="Mengalihkan..." />;
    }

    return (
        <PrimeReactProvider value={{ ripple: true }}>
            {/* {children} */}
            <div className="flex">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    isCollapsed={sidebarCollapsed}
                    currentUser={sessionUser}
                    onLogout={handleLogout}
                />

                <Sidebar
                    listMenu={sessionMenu}
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
        </PrimeReactProvider>
    );
}
