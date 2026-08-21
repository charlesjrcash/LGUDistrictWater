import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";

export default async function ServiceApplicationsLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  if (!(await getSessionUser()))
    redirect("/login?next=/transactions/service-applications");
  return (
    <>
      {children}
      {modal}
    </>
  );
}
