// "use client";

// import { SESSION_EXPIRED } from "@/constant";
// import { signOut, useSession } from "next-auth/react";
// import { usePathname } from "next/navigation";
// import { useEffect, useRef } from "react";
// import { toast } from "sonner";

// export function SessionRealtimeGuard() {
//   const { data: session, status } = useSession();
//   const pathname = usePathname();
//   const signingOutRef = useRef(false);

//   useEffect(() => {
//     if (status !== "authenticated" || !session?.isAuthorized) return;
//     if (pathname.includes("/login")) return;

//     const eventSource = new EventSource("/api/session/events");

//     const handleSessionExpired = () => {
//       if (signingOutRef.current) return;
//       signingOutRef.current = true;
//       toast.error(SESSION_EXPIRED);
//       void signOut({
//         callbackUrl: `/login?callbackUrl=${pathname}`,
//       });
//     };

//     eventSource.addEventListener("session-expired", handleSessionExpired);

//     eventSource.onerror = () => {
//       eventSource.close();
//     };

//     return () => {
//       eventSource.removeEventListener("session-expired", handleSessionExpired);
//       eventSource.close();
//     };
//   }, [pathname, session?.isAuthorized, status]);

//   return null;
// }
