import {
  WalletGrantV1Schema,
  WalletRestorationV1Schema,
  WalletSpendV1Schema,
  type CurrentActor,
  type WalletGrantV1,
  type WalletRestorationV1,
  type WalletSpendV1,
} from "@lasoviet/contracts";
import type {
  WalletError,
  WalletGrantCommand,
  WalletRepository,
  WalletRestorationCommand,
  WalletResult,
  WalletSpendCommand,
} from "./wallet.repository.js";

function invalid<T>(): WalletResult<T> {
  return { ok: false, error: { code: "WALLET_INVALID_COMMAND", messageKey: "wallet.wallet_invalid_command", retryable: false } };
}

export function createWalletService(repository: WalletRepository) {
  return {
    readBalance(actor: CurrentActor) {
      return repository.readBalance(actor);
    },
    readHistory(actor: CurrentActor) {
      return repository.readHistory(actor);
    },
    grant(command: WalletGrantCommand) {
      if (!WalletGrantV1Schema.safeParse(command.grant).success) return invalid();
      return repository.grant(command);
    },
    spend<T>(command: WalletSpendCommand<T>) {
      if (!WalletSpendV1Schema.safeParse(command.spend).success) return invalid();
      if (command.actor.kind !== "account" || command.spend.actorId !== command.actor.userId ||
        (command.continuation !== undefined && command.continuationResultCodec === undefined)) return invalid();
      return repository.spend(command);
    },
    restore(command: WalletRestorationCommand) {
      if (!WalletRestorationV1Schema.safeParse(command.restoration).success) return invalid();
      if (command.actor.kind !== "account" || command.restoration.actorId !== command.actor.userId) return invalid();
      return repository.restore(command);
    },
  };
}

export type WalletService = ReturnType<typeof createWalletService>;
export type { WalletError, WalletGrantCommand, WalletRestorationCommand, WalletSpendCommand };
