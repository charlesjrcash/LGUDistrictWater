import Link from "next/link";
import type { ReactNode } from "react";

export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50"><div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8"><div className="mx-auto max-w-7xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><span aria-hidden="true">←</span> Back to dashboard</Link></div></div>{children}</div>;
}
