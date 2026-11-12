import { AppShell } from "@/components/app-shell";
import { VaultProvider } from "@/components/vault-provider";

/** Dashboard, attack lab and docs share the sidebar shell and one live vault poll. */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <VaultProvider>
      <AppShell>{children}</AppShell>
    </VaultProvider>
  );
}
