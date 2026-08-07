import { Settings } from "@carbon/icons-react";
import { RolePageRouter, type RolePageSections } from "../../components/Layout/RolePageRouter";
import { ProgrammaticBuckets } from "./components/ProgrammaticBuckets";
import { CategoricalSlices } from "./components/CategoricalSlices";
import { ObligationRequests } from "./components/ObligationRequests";
import { FundReleases } from "./components/FundReleases";
import { EarmarkedFunds } from "./components/EarmarkedFunds";
import { ReceiptVerification } from "./components/ReceiptVerification";
import { ExactCostReview } from "./components/ExactCostReview";
import { CashAdvanceMatching } from "./components/CashAdvanceMatching";
import { UnspentFunds } from "./components/UnspentFunds";
import { CryptographicVerification } from "./components/CryptographicVerification";
import { LGUPoolReturns } from "./components/LGUPoolReturns";
import { HashedLiquidations } from "./components/HashedLiquidations";
import { NonRepudiationRecords } from "./components/NonRepudiationRecords";
import { BlockchainCommits } from "./components/BlockchainCommits";
import { PublicBiddingBypasses } from "./components/PublicBiddingBypasses";
import { COATimelineFlags } from "./components/COATimelineFlags";
import { ThirtyDayLiquidationAlerts } from "./components/ThirtyDayLiquidationAlerts";

export const financePages: RolePageSections = {
  projfin: {
    "Master Budget Allocation": ProgrammaticBuckets,
    "Programmatic Buckets": ProgrammaticBuckets,
    "Facilities Budget": CategoricalSlices,
    "Marketing Budget": CategoricalSlices,
    "Community Engagement": CategoricalSlices,
    "Program Fund Distribution": ObligationRequests,
    "Obligation Requests (ORS)": ObligationRequests,
    "Fund Releases": FundReleases,
    "Earmarked Funds": EarmarkedFunds,
  },
  liquidation: {
    "Pending Liquidations": ReceiptVerification,
    "Receipt Verification": ReceiptVerification,
    "Exact Cost Review": ExactCostReview,
    "Cash Advance Matching": CashAdvanceMatching,
    "Budget Reconciliation & Returns": UnspentFunds,
    "Unspent Funds": UnspentFunds,
    "Cryptographic Verification": CryptographicVerification,
    "LGU Pool Returns": LGUPoolReturns,
  },
  crypto: {
    "Immutable Expense Ledger": HashedLiquidations,
    "Hashed Liquidations": HashedLiquidations,
    "Non-Repudiation Records": NonRepudiationRecords,
    "Blockchain Commits": BlockchainCommits,
    "Real-Time Conformance Alerts": PublicBiddingBypasses,
    "Public Bidding Bypasses": PublicBiddingBypasses,
    "COA Timeline Flags": COATimelineFlags,
    "30-Day Liquidation Alerts": ThirtyDayLiquidationAlerts,
  },
};

export const financeDefaultPages: Record<string, string> = {
  projfin: "Programmatic Buckets",
  liquidation: "Receipt Verification",
  crypto: "Hashed Liquidations",
};

export function FinanceContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
  return (
    <RolePageRouter
      sections={financePages}
      defaults={financeDefaultPages}
      activeSection={activeSection}
      activePage={activePage}
      fallback={(section) => (
        <div className="flex h-full items-center justify-center text-neutral-400">
          <div className="text-center"><Settings size={40} className="mx-auto mb-3 opacity-30" /><p className="text-[14px]">Section unavailable</p><p className="mt-1 text-[12px]">{section}</p></div>
        </div>
      )}
    />
  );
}
