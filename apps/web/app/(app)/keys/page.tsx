import type { Metadata } from "next";
import KeysPage from "@/components/pages/keys";

export const metadata: Metadata = { title: "Keys" };

export default function Page() {
  return <KeysPage />;
}
