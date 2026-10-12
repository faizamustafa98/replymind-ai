import { Suspense } from "react";
import InboxPage from "@/src/components/dashboard/InboxPage";

export default function Inbox() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-surface"><div className="text-on-surface-variant">Loading…</div></div>}><InboxPage /></Suspense>;
}
