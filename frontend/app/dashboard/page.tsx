"use client";
import { Suspense } from "react";
import Dashboard from "@/src/components/dashboard/Dashboard";

export default function DashboardPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-surface"><div className="text-on-surface-variant">Loading…</div></div>}><Dashboard /></Suspense>;
}
