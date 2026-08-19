import type { Metadata } from "next";
import { LandingPage } from "@/modules/landing";

export const metadata: Metadata = {
  title: "Bagamanoc Water Billing System",
  description:
    "Reliable, transparent water billing and customer service for the Municipality of Bagamanoc.",
};

export default function Home() {
  return <LandingPage />;
}
