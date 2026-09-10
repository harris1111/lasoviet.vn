export type PhaseOneMaintenance = {
  purgeExpired(limit: number): Promise<string[]>;
};

export type ReconciliationMaintenance = {
  runMaintenance(): Promise<{
    circuitStatus: "closed" | "open";
    circuitTransitioned: boolean;
    staleAlerted: number;
  }>;
};

export type PhaseOneMaintenanceRunner = {
  runOnce(): Promise<{
    accountPurges: number;
    anonymousPurges: number;
    retries: number;
    reconciliation?: {
      circuitStatus: "closed" | "open";
      circuitTransitioned: boolean;
      staleAlerted: number;
    };
  }>;
};

export function createPhaseOneMaintenanceRunner(options: {
  accountDeletion: PhaseOneMaintenance;
  anonymousRetention: PhaseOneMaintenance;
  retryAuthEmail: (limit: number) => Promise<number>;
  reconciliation?: ReconciliationMaintenance;
  batchSize?: number;
}): PhaseOneMaintenanceRunner {
  const batchSize = options.batchSize ?? 25;
  let activeRun: Promise<{
    accountPurges: number;
    anonymousPurges: number;
    retries: number;
    reconciliation?: {
      circuitStatus: "closed" | "open";
      circuitTransitioned: boolean;
      staleAlerted: number;
    };
  }> | undefined;
  return {
    runOnce() {
      if (activeRun !== undefined) {
        return activeRun;
      }
      activeRun = Promise.all([
        options.accountDeletion.purgeExpired(batchSize),
        options.anonymousRetention.purgeExpired(batchSize),
        options.retryAuthEmail(batchSize),
        options.reconciliation ? options.reconciliation.runMaintenance() : Promise.resolve(undefined),
      ])
        .then(([accountPurges, anonymousPurges, retries, reconciliation]) => {
          const res: {
            accountPurges: number;
            anonymousPurges: number;
            retries: number;
            reconciliation?: {
              circuitStatus: "closed" | "open";
              circuitTransitioned: boolean;
              staleAlerted: number;
            };
          } = {
            accountPurges: accountPurges.length,
            anonymousPurges: anonymousPurges.length,
            retries,
          };
          if (reconciliation !== undefined) {
            res.reconciliation = reconciliation;
          }
          return res;
        })
        .finally(() => {
          activeRun = undefined;
        });
      return activeRun;
    },
  };
}
