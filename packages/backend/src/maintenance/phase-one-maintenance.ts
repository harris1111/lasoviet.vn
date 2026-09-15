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

export type AnalyticsMaintenance = {
  purgeExpired(
    now: Date,
    limit: number,
  ): Promise<{
    deletedUnlinkedEvents: number;
    deletedUnlinkedVisitors: number;
    scrubbedIpEvents: number;
    deletedFraudRecords: number;
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
    analytics?: {
      deletedUnlinkedEvents: number;
      deletedUnlinkedVisitors: number;
      scrubbedIpEvents: number;
      deletedFraudRecords: number;
    };
  }>;
};

export function createPhaseOneMaintenanceRunner(options: {
  accountDeletion: PhaseOneMaintenance;
  anonymousRetention: PhaseOneMaintenance;
  retryAuthEmail: (limit: number) => Promise<number>;
  reconciliation?: ReconciliationMaintenance;
  analyticsRetention?: AnalyticsMaintenance;
  batchSize?: number;
  now?: () => Date;
}): PhaseOneMaintenanceRunner {
  const batchSize = options.batchSize ?? 25;
  const getNow = options.now ?? (() => new Date());

  let activeRun: Promise<{
    accountPurges: number;
    anonymousPurges: number;
    retries: number;
    reconciliation?: {
      circuitStatus: "closed" | "open";
      circuitTransitioned: boolean;
      staleAlerted: number;
    };
    analytics?: {
      deletedUnlinkedEvents: number;
      deletedUnlinkedVisitors: number;
      scrubbedIpEvents: number;
      deletedFraudRecords: number;
    };
  }> | undefined;

  return {
    runOnce() {
      if (activeRun !== undefined) {
        return activeRun;
      }
      const now = getNow();
      activeRun = Promise.all([
        options.accountDeletion.purgeExpired(batchSize),
        options.anonymousRetention.purgeExpired(batchSize),
        options.retryAuthEmail(batchSize),
        options.reconciliation ? options.reconciliation.runMaintenance() : Promise.resolve(undefined),
        options.analyticsRetention ? options.analyticsRetention.purgeExpired(now, batchSize) : Promise.resolve(undefined),
      ])
        .then(([accountPurges, anonymousPurges, retries, reconciliation, analytics]) => {
          const res: {
            accountPurges: number;
            anonymousPurges: number;
            retries: number;
            reconciliation?: {
              circuitStatus: "closed" | "open";
              circuitTransitioned: boolean;
              staleAlerted: number;
            };
            analytics?: {
              deletedUnlinkedEvents: number;
              deletedUnlinkedVisitors: number;
              scrubbedIpEvents: number;
              deletedFraudRecords: number;
            };
          } = {
            accountPurges: accountPurges.length,
            anonymousPurges: anonymousPurges.length,
            retries,
          };
          if (reconciliation !== undefined) {
            res.reconciliation = reconciliation;
          }
          if (analytics !== undefined) {
            res.analytics = analytics;
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
