import type { Metadata } from "next";
import Lab from "@/components/lab";

export const metadata: Metadata = { title: "Attack lab" };

export default function Page() {
  return <Lab />;
}
