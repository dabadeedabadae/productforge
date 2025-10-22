// НЕ ставь "use client" здесь — layout по умолчанию серверный
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin",
    description: "Admin frontend",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}
