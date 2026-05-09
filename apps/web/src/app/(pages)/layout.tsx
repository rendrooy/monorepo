import LayoutClient from "./LayoutClient";

interface LayoutProps {
    children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
    return (
        <LayoutClient currentUser={null}>
            {children}
        </LayoutClient>
    );
}
