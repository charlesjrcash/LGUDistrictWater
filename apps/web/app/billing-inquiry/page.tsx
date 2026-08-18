import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/modules/navigation";
import BillingInquiryForm from "./billing-inquiry-form";
import styles from "./billing-inquiry.module.css";

export const metadata: Metadata = { title: "Billing Inquiry", description: "Look up a Bagamanoc water-service account by account number." };

export default function BillingInquiryPage() {
  return <><SiteHeader /><main className={styles.page}><div className={styles.glow}/><div className={styles.container}><nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Services</Link><span>›</span><strong>Billing Inquiry</strong></nav><section className={styles.intro}><span>ONLINE SERVICE</span><h1>Check your water account</h1><p>Enter the account number printed on your water bill to view the available account information.</p></section><BillingInquiryForm /></div></main></>;
}
