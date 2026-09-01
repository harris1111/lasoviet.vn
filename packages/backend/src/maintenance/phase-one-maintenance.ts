export type PhaseOneMaintenance = {
  purgeExpired(limit: number): Promise<string[]>;
};

export type PhaseOneMaintenanceRunner = {
  runOnce(): Promise<{ accountPurges: number; anonymousPurges: number; retries: number }>;
};

export function createPhaseOneMaintenanceRunner(options: {
  accountDeletion: PhaseOneMaintenance;
  anonymousRetention: PhaseOneMaintenance;
  retryAuthEmail: (limit: number) => Promise<number>;
  batchSize?: number;
}): PhaseOneMaintenanceRunner {
  const batchSize = options.batchSize ?? 25;
  let activeRun: Promise<{
    accountPurges: number;
    anonymousPurges: number;
    retries: number;
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
      ])
        .then(([accountPurges, anonymousPurges, retries]) => ({
          accountPurges: accountPurges.length,
          anonymousPurges: anonymousPurges.length,
          retries,
        }))
        .finally(() => {
          activeRun = undefined;
        });
      return activeRun;
    },
  };
}
