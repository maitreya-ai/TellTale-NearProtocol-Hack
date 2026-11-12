"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, Section } from "./motion";

const FAQ = [
  {
    q: "Does Telltale hold my funds?",
    a: "No. The vault is your own NEAR account running the Telltale contract. You own it, and you can withdraw at any time, even while it's frozen.",
  },
  {
    q: "What happens when it trips?",
    a: "The call that tripped it freezes payments in the same transaction. About a block later the vault deletes every agent key on its own account. Deposits and owner withdrawals keep working, and one owner transaction re-arms it with fresh keys.",
  },
  {
    q: "Can an attacker tell which keys are bait?",
    a: "No. Every agent key looks the same on-chain and nothing lists the decoys, so reading the contract tells them nothing. Any key used without the signer's proof trips the vault.",
  },
  {
    q: "What if the signer itself is compromised?",
    a: "Then a thief could pay inside the limits, which is why the per-payment cap, daily cap and allowlist stay on. Moving the signer into a TEE is next on the roadmap.",
  },
  {
    q: "Does it work with my agent?",
    a: "Any agent that speaks MCP gets the decoy tools from the Telltale MCP server. Payments go through the signer API, which works with any framework or model.",
  },
  {
    q: "Why does this need NEAR?",
    a: "A NEAR account holds many keys and a contract can see which one signed. Function-call keys can't move funds, and a contract can delete keys on its own account. Elsewhere each of these needs custom account abstraction.",
  },
];

export function Faq() {
  return (
    <Section id="faq" label="Questions">
      <div className="grid grid-cols-1 gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1fr_1.6fr] md:py-14">
        <Reveal>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
            The short answers. The architecture doc has the long ones.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <Accordion type="single" collapsible defaultValue="0" className="border-t">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={String(i)}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Section>
  );
}
