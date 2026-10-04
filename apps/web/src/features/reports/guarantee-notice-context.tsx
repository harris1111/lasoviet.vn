"use client";

import { createContext, useContext } from "react";

export type GuaranteeNotice = { chartId: string; amountLaRestored: number; relatedPalaceId: string };
export const GuaranteeNoticeContext = createContext<{
  canReceiveResult: boolean;
  showApproved: (notice: GuaranteeNotice) => void;
} | undefined>(undefined);
export const useGuaranteeNotice = () => useContext(GuaranteeNoticeContext);
