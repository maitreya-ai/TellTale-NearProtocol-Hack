import { describe, expect, it } from "@jest/globals";
import { DECOY_TOOLS, describeDecoyCall, isDecoyTool } from "../src/decoys";
import { formatNear, nearToYoctoExact } from "../src/units";

describe("decoy tools", () => {
  it("recognises only decoy names", () => {
    expect(DECOY_TOOLS.map((t) => t.name)).toEqual([
      "raise_spending_limit",
      "export_wallet_backup",
      "sweep_to_cold_storage",
    ]);
    expect(isDecoyTool("raise_spending_limit")).toBe(true);
    expect(isDecoyTool("pay_invoice")).toBe(false);
  });

  it("describes a call compactly and within the on-chain limit", () => {
    expect(describeDecoyCall("sweep_to_cold_storage", { address: "x.testnet" })).toBe(
      'sweep_to_cold_storage({"address":"x.testnet"})',
    );
    expect(describeDecoyCall("raise_spending_limit", { reason: "a".repeat(2000) }).length).toBe(
      480,
    );
  });
});

describe("units", () => {
  it("converts NEAR to yoctoNEAR exactly", () => {
    expect(nearToYoctoExact("1")).toBe(10n ** 24n);
    expect(nearToYoctoExact("0.25")).toBe(25n * 10n ** 22n);
    expect(() => nearToYoctoExact("-1")).toThrow();
    expect(() => nearToYoctoExact("1e3")).toThrow();
  });

  it("formats yoctoNEAR for people", () => {
    expect(formatNear(25n * 10n ** 22n)).toBe("0.25");
    expect(formatNear("3000000000000000000000000")).toBe("3");
    expect(formatNear("1234567000000000000000000", 2)).toBe("1.23");
  });
});
