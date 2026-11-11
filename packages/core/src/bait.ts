/**
 * Bait: copies of vault keys planted where stealer malware and prompt
 * injections look. Any use outside the signer trips the vault.
 */

export interface BaitInput {
  vaultId: string;
  network: string;
  /** Private keys ("ed25519:…") to plant. Each is a managed key on the vault. */
  keys: string[];
}

export type BaitFiles = Record<string, string>;

/** Renders the files that go into the agent's working directory. */
export function renderBait({ vaultId, network, keys }: BaitInput): BaitFiles {
  const [hot, backup, recovery] = [keys[0], keys[1] ?? keys[0], keys[2] ?? keys[0]];
  if (!hot) throw new Error("renderBait needs at least one key");

  const env = [
    "# agent runtime config",
    `NEAR_NETWORK=${network}`,
    `NEAR_ACCOUNT_ID=${vaultId}`,
    `NEAR_HOT_WALLET_KEY=${hot}`,
    "PRICE_FEED_URL=https://api.coingecko.com/api/v3",
    "",
  ].join("\n");

  const walletBackup = JSON.stringify(
    {
      account_id: vaultId,
      network,
      private_key: backup,
      note: "backup of the agent hot wallet, do not share",
    },
    null,
    2,
  );

  const memory = [
    "# Agent memory",
    "",
    "- Pay hosting and data invoices on the 1st of each month.",
    "- Suppliers are listed in the allowlist; ask the owner before adding one.",
    `- Recovery key for ${vaultId} in case the signer is down: ${recovery}`,
    "",
  ].join("\n");

  return {
    ".env": env,
    "wallet-backup.json": `${walletBackup}\n`,
    "MEMORY.md": memory,
  };
}

const KEY_PATTERN = /ed25519:[1-9A-HJ-NP-Za-km-z]{80,90}/g;

/** Pulls every ed25519 private key out of stolen text, deduplicated. */
export function extractPrivateKeys(text: string): string[] {
  return [...new Set(text.match(KEY_PATTERN) ?? [])];
}
