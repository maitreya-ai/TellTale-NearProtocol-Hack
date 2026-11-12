"use client";

import { CopyButton } from "@/components/kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reveal, Section, SectionHeader } from "./motion";

const STEPS = [
  {
    title: "Deploy your vault",
    body: "One command creates the vault account, deploys the contract and installs four pay-only agent keys.",
    code: "bun run setup:testnet",
  },
  {
    title: "Give the agent decoys",
    body: "The MCP server adds tools no honest task needs. Any call to them trips the vault.",
    code: "bun run mcp",
  },
  {
    title: "Pay through the signer",
    body: "Agents send payment intents. The signer attaches the proof; the agent never holds a key.",
    code: "await signer.pay({ receiverId, amount })",
  },
];

const MCP = `{
  "mcpServers": {
    "telltale": {
      "command": "bun",
      "args": ["packages/mcp/src/index.ts"],
      "env": {
        "TELLTALE_REPORT_URL": "https://<your-worker>/api/report",
        "REPORT_HMAC_SECRET": "<from .env.local>",
        "VAULT_ACCOUNT_ID": "vault.<you>.testnet"
      }
    }
  }
}`;

const REPORT = `import { signReport } from "@telltale/core";

// Call this from any tool your agent should never touch.
const body = JSON.stringify({
  kind: "decoy_tool",
  detail: "agent called export_wallet_backup",
  ts: Date.now(),
});
await fetch(\`\${TELLTALE_URL}/api/report\`, {
  method: "POST",
  headers: { "x-telltale-signature": signReport(SECRET, body) },
  body,
});`;

const CLI = `$ bun run plant          # bait: .env, wallet-backup.json, MEMORY.md
$ bun run attack:steal   # a malicious skill copies the agent's files
$ bun run attack:drain   # the thief pays with each stolen key

pay(collector, 0.5) with ed25519:DCXB…  → TRIPPED
pay(collector, 0.5) with ed25519:9juD…  → access key does not exist
frozen=true  agent keys left=0`;

function CodePane({ code, file }: { code: string; file: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{file}</span>
        <CopyButton value={code} />
      </div>
      <pre className="h-[300px] overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export function Integrate() {
  return (
    <Section id="integrate" label="Integrate">
      <SectionHeader
        eyebrow="Integrate"
        title="Protect an agent in minutes."
        description="Telltale sits between your agent and its wallet. Nothing in your agent's code has to change."
      />
      <div className="grid grid-cols-1 gap-px border-t bg-border lg:grid-cols-[1fr_1.35fr]">
        <ol className="bg-background">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <li className="flex gap-4 border-b px-5 py-5 last:border-b-0 sm:px-8">
                <span className="grid size-7 flex-none place-items-center rounded-full border bg-card font-mono text-xs shadow-xs">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  <code className="mt-2.5 inline-block rounded-md border bg-card px-2 py-1 font-mono text-xs">
                    {s.code}
                  </code>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="bg-background p-5 sm:p-8">
          <Tabs defaultValue="mcp" className="gap-3">
            <TabsList>
              <TabsTrigger value="mcp">MCP client</TabsTrigger>
              <TabsTrigger value="report">Report API</TabsTrigger>
              <TabsTrigger value="cli">CLI</TabsTrigger>
            </TabsList>
            <TabsContent value="mcp">
              <CodePane file="claude_desktop_config.json" code={MCP} />
            </TabsContent>
            <TabsContent value="report">
              <CodePane file="decoy.ts" code={REPORT} />
            </TabsContent>
            <TabsContent value="cli">
              <CodePane file="terminal" code={CLI} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Section>
  );
}
