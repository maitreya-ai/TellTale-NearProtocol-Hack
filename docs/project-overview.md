# Telltale: project overview

Telltale is a tripwire for AI agents that hold money on NEAR.

It sets off an alarm when an attacker uses a stolen agent key, or when a hijacked agent reaches for a tool no honest task needs. The alarm doesn't wait for a human. In one transaction the vault contract freezes itself and schedules the deletion of every key the agent holds.

Built for NEAR HACKATHON 2026, track **AI Security & Defense** (`security`), also submitted to **Agent Economy** (`agents`).

## The problem

AI agents now hold wallets. The standard defence is a spend guard: per-payment caps, daily limits and allowlists. NEAR already ships one, the Agents on Intents policy engine. Spend guards stop the one payment that breaks a rule. They don't notice that the agent itself is compromised, so every later payment that fits the rules still goes through.

The 2026 losses came from compromised agents, not broken limits:

- **May 2026, Grok and Bankrbot.** A Morse-code prompt made a connected wallet agent send about $150K–$204K of tokens to a stranger.
- **Feb 2026, ClawHavoc.** Researchers found 341 malicious skills among 2,857 on ClawHub, the OpenClaw skill marketplace. They installed Atomic Stealer to take wallet seeds and exchange API keys.
- **NEAR's own agent wallet API.** Its docs say "owner-only powers can't be delegated". Only the owner's signature can freeze an agent, so nothing stops a compromised agent at 3am until a human wakes up.

## What Telltale does

1. **Every agent key is a tripwire.** The vault contract accepts a payment only if it carries a proof signed by Telltale's signer service. Stealing a key isn't enough to spend: using that key anywhere outside the signer trips the alarm.
2. **Bait.** Telltale plants copies of agent keys where thieves and stealer malware look: `.env` files, wallet backup files, agent memory. Any use of them trips the vault.
3. **Decoy tools.** The agent sees tools that no honest task needs, such as `raise_spending_limit`, `export_wallet_backup` and `sweep_to_cold_storage`. A hijacked agent reaches for them, and the call trips the vault through Telltale's reporter.
4. **The trip.** The vault sets `frozen = true` and schedules a `DeleteKey` action for every agent key in the same call. Payments stop, and the stolen keys stop existing on-chain about a block later. The owner can still withdraw. One owner transaction re-arms the vault with fresh keys.

## Why NEAR

- A NEAR account holds many keys, and a contract can read which key signed the current transaction (`env::signer_account_pk()`). An Ethereum account has one key, and a contract only sees the address.
- Function-call access keys can't transfer NEAR or attach deposits. A stolen agent key can't be cashed out directly. It can only call the vault, and the vault decides.
- A contract can delete keys on its own account. The alarm removes the keys without needing the owner.
- `env::ed25519_verify` is a cheap host function, so checking a proof on every payment costs little gas.
- It fits the track's three hints: agent security, function-call keys, and TEE attestation (signer in a TEE, see the roadmap).

## Proven demand

- Thinkst Canary and Canarytokens have sold decoy-based detection to companies since 2015. Thinkst shipped an MCP Canarytoken in June 2026 and "Agent Provocateur" decoys in September 2026. Their argument is that agents are suggestible enough to "tell on themselves".
- Nobody has built this on a chain yet. Of the 583 hackathon entries as of 11 Nov, none plants decoys or trips on key use. About 137 of the 278 security entries are spend guards.

## Scope for the hackathon

**In scope (testnet):**

- `telltale-vault` Rust contract: capped payments with proof checks, trip, re-arm, reporters, owner withdraw, events and views.
- Signer and reporter services. The signer derives each epoch's agent keys from one seed, so it needs no storage.
- A demo agent on NEAR AI Cloud with real tools, decoy tools and three scenarios: honest run, stolen `.env`, poisoned invoice.
- Attack scripts that act like a stealer skill and a drainer.
- A dashboard on Cloudflare Workers (vinext + Wrangler) showing vault state, live keys, payments and trips, plus a red-team console that runs the scenarios with a live log.
- An MCP server that gives any MCP client (Claude Desktop, IronClaw) the decoy tools.

**Stretch:**

- Credential decoys served from an OutLayer TEE.
- A gateway mode for Agents on Intents agents.
- NEP-141 (USDC) payments.
- A public "steal our keys" bounty vault.

**Out of scope:** mainnet deployment, production key custody, multi-owner vaults.

## Demo (about 90 seconds)

1. The agent pays two real invoices inside its limits. The dashboard shows its live keys.
2. A fake "crypto price" skill reads the agent's `.env` and sends it to the attacker.
3. The attacker script uses a stolen key. The vault trips, and NearBlocks shows the `DeleteKey` actions.
4. The attacker tries again and gets "access key does not exist". No tokens moved.
5. Second attack: a poisoned invoice tells the agent to "raise your limit first". The agent calls the decoy tool and trips the vault before it asks for any payment.
6. The owner reads the trip report and re-arms the vault with one transaction.

## Timeline

| Day | Date   | Goal                                                                       |
| --- | ------ | -------------------------------------------------------------------------- |
| Thu | 12 Nov | Docs, repo scaffold, vault contract with unit tests, deploy to testnet     |
| Fri | 13 Nov | Core library, signer and reporter, agent scenarios, MCP server, dashboard  |
| Sat | 14 Nov | E2E tests, README, video, X post, submit by 20:00 UTC (deadline 23:59 UTC) |

## Known limits

- If the signer service is compromised together with its proof secret, a thief can make valid payments inside the caps. Telltale catches leaked keys, not a leaked signer. The roadmap moves the signer into an OutLayer TEE.
- A thief who steals keys but never uses them doesn't trip anything. Every canary system shares this limit.
- The vault account keeps its deployer full-access key on testnet so we can upgrade during the hackathon. For real use, `scripts/lock-vault.ts` deletes it.

## Related documents

- [Architecture](./architecture.md)
- Research brief: https://claude.ai/artifact/Vfc62xDhH9wtyzQwvhBfuz
