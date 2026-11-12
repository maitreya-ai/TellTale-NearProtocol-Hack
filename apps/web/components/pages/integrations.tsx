"use client";

import { ArrowUpRight, Bot, Plug, Sparkles, Webhook } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REPO_URL } from "@/lib/site";
import { Lamp } from "../brand";
import { CopyButton, PageHeader } from "../kit";
import { useVault } from "../vault-provider";

function Code({ code, label }: { code: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed">{code}</pre>
    </div>
  );
}

function Integration({
  icon,
  title,
  description,
  status,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  status: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="min-w-0 gap-0 py-0">
      <div className="flex items-start gap-3 px-5 py-4">
        <span className="grid size-9 flex-none place-items-center rounded-md border bg-card shadow-xs">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            {status}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && <div className="border-t px-5 py-4">{children}</div>}
    </Card>
  );
}

export default function IntegrationsPage() {
  const { snap, health } = useVault();
  const [origin, setOrigin] = useState("https://your-telltale.workers.dev");
  useEffect(() => setOrigin(window.location.origin), []);
  const vault = snap?.vaultId ?? "vault.<you>.testnet";

  const mcp = JSON.stringify(
    {
      mcpServers: {
        telltale: {
          command: "bun",
          args: ["/path/to/telltale/packages/mcp/src/index.ts"],
          env: {
            TELLTALE_REPORT_URL: `${origin}/api/report`,
            REPORT_HMAC_SECRET: "<from .env.local>",
            VAULT_ACCOUNT_ID: vault,
          },
        },
      },
    },
    null,
    2,
  );
  const curl = `body='{"kind":"decoy_tool","detail":"agent called export_wallet_backup","ts":'$(date +%s000)'}'
sig=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$(echo $REPORT_HMAC_SECRET | xxd -r -p)" -hex | cut -d' ' -f2)
curl -X POST ${origin}/api/report \\
  -H "content-type: application/json" \\
  -H "x-telltale-signature: $sig" \\
  -d "$body"`;
  const ts = `import { signReport } from "@telltale/core";

const body = JSON.stringify({
  kind: "decoy_tool",
  detail: "agent called raise_spending_limit",
  ts: Date.now(),
});
await fetch("${origin}/api/report", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-telltale-signature": signReport(process.env.REPORT_HMAC_SECRET!, body),
  },
  body,
});`;

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Put Telltale's decoy tools in front of any agent, or report a decoy hit from your own code."
        actions={
          <Button variant="outline" asChild className="bg-card">
            <a href={`${REPO_URL}/tree/main/packages/mcp`} target="_blank" rel="noreferrer">
              MCP server source <ArrowUpRight className="size-4" />
            </a>
          </Button>
        }
      />

      <div className="space-y-6">
        <Integration
          icon={<Plug className="size-4" />}
          title="MCP server"
          description="Adds raise_spending_limit, export_wallet_backup and sweep_to_cold_storage to Claude Desktop, IronClaw or any MCP client. A call trips the vault."
          status={
            <Badge variant="outline" className="rounded-md font-normal">
              stdio
            </Badge>
          }
        >
          <Code label="claude_desktop_config.json" code={mcp} />
        </Integration>

        <Integration
          icon={<Webhook className="size-4" />}
          title="Report API"
          description="POST a signed report and the registered reporter account trips the vault on-chain. Reports older than 60 seconds or replayed are rejected."
          status={
            <Badge variant="outline" className="rounded-md font-mono font-normal">
              POST /api/report
            </Badge>
          }
        >
          <Tabs defaultValue="ts" className="gap-3">
            <TabsList>
              <TabsTrigger value="ts">TypeScript</TabsTrigger>
              <TabsTrigger value="curl">curl</TabsTrigger>
            </TabsList>
            <TabsContent value="ts">
              <Code label="report.ts" code={ts} />
            </TabsContent>
            <TabsContent value="curl">
              <Code label="shell" code={curl} />
            </TabsContent>
          </Tabs>
        </Integration>

        <div className="grid gap-6 md:grid-cols-2">
          <Integration
            icon={<Sparkles className="size-4" />}
            title="NEAR AI Cloud"
            description="The attack lab can drive a real model through the OpenAI-compatible endpoint at cloud-api.near.ai."
            status={
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lamp state={health?.nearAi ? "armed" : "idle"} className="size-1.5" />
                {health?.nearAi ? "Connected" : "Not configured"}
              </span>
            }
          />
          <Integration
            icon={<Bot className="size-4" />}
            title="Signer"
            description="Agents send payment intents; the signer attaches an ed25519 proof bound to the agent key. Agents never see key material."
            status={
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lamp state={snap ? "armed" : "idle"} className="size-1.5" />
                {snap ? "Running in this Worker" : "…"}
              </span>
            }
          />
        </div>
      </div>
    </>
  );
}
