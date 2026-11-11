import {
  liveRearm,
  liveReport,
  livePorts,
  pickModel,
  SimulatedVault,
  type Log,
  type ModelChoice,
  type ScenarioPorts,
} from "@telltale/agent";
import {
  chainConfig,
  VaultClient,
  type LiveAccessKey,
  type Trip,
  type VaultConfig,
  type VaultStatus,
} from "./deps";
import type { PaymentView, TripView, VaultSnapshot } from "../types";

export const isSimulation = (): boolean => process.env.TELLTALE_MOCK === "1";

let simulated: SimulatedVault | null = null;
export function simulation(): SimulatedVault {
  simulated ??= new SimulatedVault("vault.telltale-demo.testnet");
  return simulated;
}

function liveVault(): { vault: VaultClient; network: string; explorerUrl: string } {
  const chain = chainConfig();
  return {
    vault: new VaultClient(chain.vaultId, chain.rpcUrl),
    network: chain.network,
    explorerUrl: chain.explorerUrl,
  };
}

function tripView(trip: Trip, index: number): TripView {
  const cause = trip.cause;
  const base = {
    index,
    epoch: trip.epoch,
    keysDeleted: trip.keys_deleted,
    at: Number(trip.timestamp_ms),
    blockHeight: trip.block_height,
    signerPk: trip.signer_pk,
  };
  if (cause.kind === "stolen_key")
    return { ...base, cause: "stolen_key", detail: `${cause.reason} · key ${cause.public_key}` };
  if (cause.kind === "report") return { ...base, cause: cause.report, detail: cause.detail };
  return { ...base, cause: "strikes", detail: `${cause.count} denied payments in one window` };
}

async function liveSnapshot(): Promise<VaultSnapshot> {
  const { vault, network, explorerUrl } = liveVault();
  const [status, config, accessKeys, trips, payments] = await Promise.all([
    vault.getStatus(),
    vault.getConfig(),
    vault.getAccessKeys(),
    vault.getTrips(),
    vault.getPayments(),
  ]);
  return {
    mode: "live",
    network,
    vaultId: vault.vaultId,
    explorerUrl,
    status,
    config,
    accessKeys,
    trips: trips.map(tripView).reverse(),
    payments: payments
      .map<PaymentView>((p, index) => ({
        index,
        receiverId: p.receiver_id,
        amount: p.amount,
        memo: p.memo,
        epoch: p.epoch,
        at: Number(p.timestamp_ms),
        blockHeight: p.block_height,
      }))
      .reverse(),
    fetchedAt: Date.now(),
  };
}

function simulationSnapshot(): VaultSnapshot {
  const sim = simulation();
  const status: VaultStatus = sim.status();
  const config: VaultConfig = sim.config();
  const accessKeys: LiveAccessKey[] = [...sim.keys].map((publicKey, i) => ({
    public_key: publicKey,
    permission: { receiver_id: sim.vaultId, method_names: ["pay"] },
    nonce: String(1000 + i),
  }));
  return {
    mode: "simulation",
    network: "simulation",
    vaultId: sim.vaultId,
    explorerUrl: "",
    status,
    config,
    accessKeys,
    trips: sim.trips
      .map<TripView>((t, index) => ({
        index,
        epoch: t.epoch,
        keysDeleted: t.keys_deleted,
        at: t.at,
        cause: t.cause as TripView["cause"],
        detail: t.detail,
      }))
      .reverse(),
    payments: sim.transfers
      .map<PaymentView>((p, index) => ({
        index,
        receiverId: p.to,
        amount: p.amount.toString(),
        memo: null,
        epoch: 0,
        at: sim.createdAt,
      }))
      .reverse(),
    fetchedAt: Date.now(),
  };
}

export function snapshot(): Promise<VaultSnapshot> {
  return isSimulation() ? Promise.resolve(simulationSnapshot()) : liveSnapshot();
}

export type { ModelChoice };

export function scenarioPorts(log: Log, choice: ModelChoice): ScenarioPorts {
  if (isSimulation()) {
    return simulation().ports({ log, model: pickModel(choice) }).ports;
  }
  return livePorts(log, pickModel(choice));
}

/** Owner re-arm: unfreeze and install the next epoch's keys. */
export async function rearm(): Promise<{ epoch: number; txHash: string | null }> {
  if (isSimulation()) {
    simulation().rearm();
    return { epoch: simulation().epoch, txHash: null };
  }
  return liveRearm();
}

/** Trips the vault through the reporter (used by the MCP server's HTTP reports). */
export async function reportTrip(
  kind: "decoy_tool" | "decoy_credential" | "manual",
  detail: string,
) {
  if (isSimulation()) {
    simulation().trip(kind, detail);
    return { txHash: null };
  }
  return liveReport(kind, detail);
}
