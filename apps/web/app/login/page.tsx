import Link from "next/link";
import LoginForm from "./login-form";

export default function LoginPage() {
  return <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6"><div className="mx-auto max-w-md"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">LGU District Water</p><LoginForm /><p className="mt-5 text-center text-sm text-slate-600">Need an account? <Link href="/" className="font-semibold text-blue-700 hover:text-blue-800">Contact an administrator</Link></p></div></main>;
}
