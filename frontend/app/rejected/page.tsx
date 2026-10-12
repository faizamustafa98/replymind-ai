import { Suspense } from "react";
import RejectedPage from "@/src/components/dashboard/RejectedPage";

export default function Rejected() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-surface"><div className="text-on-surface-variant">Loading…</div></div>}><RejectedPage /></Suspense>;
}
