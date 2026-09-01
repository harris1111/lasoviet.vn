export type PhaseOneMaintenance = {
  purgeExpired(): Promise<string[]>;
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
  return {
    async runOnce() {
      const [accountPurges, anonymousPurges, retries] = await Promise.all([
        options.accountDeletion.purgeExpired(),
        options.anonymousRetention.purgeExpired(),
        options.retryAuthEmail(batchSize),
      ]);
      return {
        accountPurges: accountPurges.length,
        anonymousPurges: anonymousPurges.length,
        retries,
      };
    },
  };
}
