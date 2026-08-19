import type { Metadata } from "next";
import Link from "next/link";
import RegistrationForm from "../registration-form";
import { getActiveEmployees, getActiveRoles } from "@/lib/roles";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Create User Account",
  description:
    "Create a system user account for the Bagamanoc Water Billing System.",
};

export default async function RegisterPage() {
  await connection();

  const [initialRoles, initialEmployees] = await Promise.all([
    getActiveRoles(),
    getActiveEmployees(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Page heading */}
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            LGU District Water
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Create a user account
          </h1>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-slate-600">
              Select an employee and assign their system access role.
            </p>

            <Link
              href="/login"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              User sign in
            </Link>
          </div>
        </div>

        <RegistrationForm
          initialRoles={initialRoles}
          initialEmployees={initialEmployees}
        />
      </div>
    </main>
  );
}
