import PlatformConsoleLayout from "./PlatformConsoleLayout";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PlatformConsoleLayout>{children}</PlatformConsoleLayout>;
}
