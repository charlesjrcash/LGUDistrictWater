import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";

export default async function ServiceAccountsLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  if (!(await getSessionUser()))
    redirect("/login?next=/transactions/service-accounts");
  return (
    <>
      {children}
      {modal}
    </>
  );
}
