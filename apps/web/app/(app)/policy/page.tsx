import type { Metadata } from "next";
import PolicyPage from "@/components/pages/policy";

export const metadata: Metadata = { title: "Policy" };

export default function Page() {
  return <PolicyPage />;
}
