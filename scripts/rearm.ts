/** Owner re-arm: unfreezes the vault and installs the next epoch's agent keys. */
import { explorerTxUrl } from "@telltale/core";
import { liveRearm } from "@telltale/agent";

const { epoch, txHash } = await liveRearm();
console.log(
  `Re-armed at epoch ${epoch}: ${explorerTxUrl(process.env.NEAR_EXPLORER_URL || "https://testnet.nearblocks.io", txHash)}`,
);
console.log("Run `bun run plant` to refresh the bait for the new keys.");
