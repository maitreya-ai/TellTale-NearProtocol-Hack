import type { Metadata } from "next";
import IntegrationsPage from "@/components/pages/integrations";

export const metadata: Metadata = { title: "Integrations" };

export default function Page() {
  return <IntegrationsPage />;
}
