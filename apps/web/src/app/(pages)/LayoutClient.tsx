"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
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
// import { getCookie, setCookie, removeCookie } from "@/utils/CookieUtils";

interface LayoutClientProps {
    children: ReactNode;
    currentUser: MasterUserInterface | null;
    frontendTTL?: string;
}

export default function LayoutClient({ children, currentUser, frontendTTL }: Readonly<LayoutClientProps>) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sessionUser, setSessionUser] = useState<MasterUserInterface | null>(currentUser);
    const [sessionMenu, setSessionMenu] = useState<AuthMenuTreeInterface[]>([]);
    const [checkingSession, setCheckingSession] = useState(true);
    // const { data: session, status } = useSession();
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoggingOutRef = useRef(false);

    const router = useRouter();
    const pathname = usePathname();
    const { callApi: callMe } = useApiService("meAuth");
    const { callApi: callMenu } = useApiService("menuAuth");

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

        setSessionUser(getAuthUser());
        setSessionMenu(getAuthMenu());
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

    if (checkingSession) {
        return (
            <PrimeReactProvider value={{ ripple: true }}>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-sm text-slate-500">Loading...</div>
                </div>
            </PrimeReactProvider>
        );
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
