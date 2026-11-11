import {
  Account,
  JsonRpcProvider,
  getTransactionLastResult,
  teraToGas,
  type KeyPairString,
} from "near-api-js";
import type {
  LiveAccessKey,
  PayOutcome,
  Payment,
  Policy,
  ReportKind,
  Trip,
  TxResult,
  VaultConfig,
  VaultStatus,
} from "./types";

const PAY_GAS = teraToGas("100");
const OWNER_GAS = teraToGas("100");
const ONE_YOCTO = 1n;

export interface PayArgs {
  receiverId: string;
  amount: string | bigint;
  memo?: string | null;
  nonce?: number | bigint | null;
  /** base64 signer proof. Leave out to behave like a thief. */
  proof?: string | null;
}

function txHashOf(outcome: unknown): string {
  const o = outcome as { transaction_outcome?: { id?: string }; transaction?: { hash?: string } };
  return o.transaction_outcome?.id ?? o.transaction?.hash ?? "";
}

/** Typed access to one telltale-vault contract. */
export class VaultClient {
  readonly provider: JsonRpcProvider;

  constructor(
    readonly vaultId: string,
    rpcUrl: string,
  ) {
    this.provider = new JsonRpcProvider({ url: rpcUrl });
  }

  private async view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    return (await this.provider.callFunction({
      contractId: this.vaultId,
      method,
      args,
    })) as T;
  }

  getStatus(): Promise<VaultStatus> {
    return this.view("get_status");
  }

  getConfig(): Promise<VaultConfig> {
    return this.view("get_config");
  }

  getManagedKeys(): Promise<string[]> {
    return this.view("get_managed_keys");
  }

  getTrips(fromIndex = 0, limit = 100): Promise<Trip[]> {
    return this.view("get_trips", { from_index: String(fromIndex), limit });
  }

  getPayments(fromIndex = 0, limit = 100): Promise<Payment[]> {
    return this.view("get_payments", { from_index: String(fromIndex), limit });
  }

  getProofMessage(args: {
    publicKey: string;
    receiverId: string;
    amount: string | bigint;
    nonce: number | bigint;
    memo?: string | null;
  }): Promise<string> {
    return this.view("get_proof_message", {
      public_key: args.publicKey,
      receiver_id: args.receiverId,
      amount: BigInt(args.amount).toString(),
      nonce: BigInt(args.nonce).toString(),
      memo: args.memo ?? null,
    });
  }

  /** Access keys that exist on the vault account right now. */
  async getAccessKeys(): Promise<LiveAccessKey[]> {
    const list = await this.provider.viewAccessKeyList({
      accountId: this.vaultId,
      finalityQuery: { finality: "final" },
    });
    return list.keys.map((entry) => {
      const raw = entry as unknown as {
        public_key: string;
        access_key: {
          nonce: number | bigint | string;
          permission:
            "FullAccess" | { FunctionCall: { receiver_id: string; method_names: string[] } };
        };
      };
      const permission = raw.access_key.permission;
      return {
        public_key: raw.public_key,
        nonce: String(raw.access_key.nonce),
        permission:
          permission === "FullAccess"
            ? "FullAccess"
            : {
                receiver_id: permission.FunctionCall.receiver_id,
                method_names: permission.FunctionCall.method_names,
              },
      };
    });
  }

  /** Calls `pay` signed by one of the vault's agent keys. */
  async pay(agentKey: KeyPairString, args: PayArgs): Promise<TxResult<PayOutcome>> {
    const account = new Account(this.vaultId, this.provider, agentKey);
    const outcome = await account.callFunctionRaw({
      contractId: this.vaultId,
      methodName: "pay",
      args: {
        receiver_id: args.receiverId,
        amount: BigInt(args.amount).toString(),
        memo: args.memo ?? null,
        nonce: args.nonce == null ? null : BigInt(args.nonce).toString(),
        proof: args.proof ?? null,
      },
      gas: PAY_GAS,
      deposit: 0n,
    });
    return { value: getTransactionLastResult(outcome) as PayOutcome, txHash: txHashOf(outcome) };
  }

  /** Trips the vault as a registered reporter. */
  async report(
    reporterId: string,
    reporterKey: KeyPairString,
    kind: ReportKind,
    detail: string,
  ): Promise<TxResult<string>> {
    const account = new Account(reporterId, this.provider, reporterKey);
    const outcome = await account.callFunctionRaw({
      contractId: this.vaultId,
      methodName: "report",
      args: { kind, detail },
      gas: PAY_GAS,
      deposit: 0n,
    });
    return { value: getTransactionLastResult(outcome) as string, txHash: txHashOf(outcome) };
  }

  /** Owner operations. Each attaches 1 yoctoNEAR, which forces a full-access key. */
  owner(ownerId: string, ownerKey: KeyPairString) {
    const account = new Account(ownerId, this.provider, ownerKey);
    const call = async (methodName: string, args: Record<string, unknown>) => {
      const outcome = await account.callFunctionRaw({
        contractId: this.vaultId,
        methodName,
        args,
        gas: OWNER_GAS,
        deposit: ONE_YOCTO,
      });
      return { value: getTransactionLastResult(outcome), txHash: txHashOf(outcome) };
    };
    return {
      account,
      addKeys: (publicKeys: string[]) => call("add_keys", { public_keys: publicKeys }),
      rearm: (publicKeys: string[]) => call("rearm", { public_keys: publicKeys }),
      setPolicy: (policy: Policy) => call("set_policy", { policy }),
      setSigner: (signerPk: string) => call("set_signer", { signer_pk: signerPk }),
      addReporter: (accountId: string) => call("add_reporter", { account_id: accountId }),
      removeReporter: (accountId: string) => call("remove_reporter", { account_id: accountId }),
      withdraw: (amount: string | bigint) =>
        call("withdraw", { amount: BigInt(amount).toString() }),
      report: (kind: ReportKind, detail: string) => call("report", { kind, detail }),
    };
  }
}
