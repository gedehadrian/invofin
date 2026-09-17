import type { RiskBand } from "@/lib/database.types";
import {
  IsolationForest,
  ISOLATION_FOREST_MIN_SAMPLES,
  ISOLATION_FOREST_OUTLIER_THRESHOLD,
} from "@/lib/risk/isolation-forest";
import {
  bandFromScore,
  daysBetween,
  type DocumentSnapshot,
  type ExtractedFields,
  type InvoiceInput,
  type ReasonCode,
  REASON_CODES,
  runDocumentConsistencyRules,
  scoreFromFindings,
} from "@/lib/risk/rules-engine";

export type HistoricalInvoicePoint = {
  amount: number;
  issueDate: string;
  dueDate: string;
  requestedAdvancePercent: number | null;
};

export type AssessmentResult = {
  score: number;
  riskBand: RiskBand;
  reasonCodes: { code: ReasonCode; message: string }[];
  anomalyFlags: { code: ReasonCode; message: string }[];
  assessmentMethod: string;
  requiresManualReview: true;
  isolationForest?: {
    ran: boolean;
    samples: number;
    score: number | null;
    outlier: boolean;
  };
};

export function featuresFromInvoice(point: HistoricalInvoicePoint): number[] {
  const tenor = Math.max(1, daysBetween(point.issueDate, point.dueDate));
  const amountLog = Math.log10(Math.max(point.amount, 1));
  const advance = point.requestedAdvancePercent ?? 80;
  return [amountLog, tenor, advance];
}

export function runRiskAssessment(args: {
  invoice: InvoiceInput;
  documents: DocumentSnapshot[];
  vendorHistory: HistoricalInvoicePoint[];
  azureConfigured: boolean;
}): AssessmentResult {
  const findings = runDocumentConsistencyRules({
    invoice: args.invoice,
    documents: args.documents,
    vendorHistoricalAmounts: args.vendorHistory.map((h) => h.amount),
  });

  const historyFeatures = args.vendorHistory.map(featuresFromInvoice);
  let isolationRan = false;
  let isolationScore: number | null = null;
  let isolationOutlier = false;

  if (historyFeatures.length >= ISOLATION_FOREST_MIN_SAMPLES) {
    const forest = new IsolationForest({ nTrees: 80, maxSamples: 256 });
    forest.fit(historyFeatures);
    isolationScore = forest.score(
      featuresFromInvoice({
        amount: args.invoice.amount,
        issueDate: args.invoice.issueDate,
        dueDate: args.invoice.dueDate,
        requestedAdvancePercent: args.invoice.requestedAdvancePercent,
      }),
    );
    isolationRan = true;
    isolationOutlier = isolationScore >= ISOLATION_FOREST_OUTLIER_THRESHOLD;
    if (isolationOutlier) {
      findings.push({
        code: "ISOLATION_FOREST_OUTLIER",
        message: REASON_CODES.ISOLATION_FOREST_OUTLIER,
        anomaly: true,
      });
    }
  } else {
    findings.push({
      code: "INSUFFICIENT_HISTORY",
      message: REASON_CODES.INSUFFICIENT_HISTORY,
      anomaly: false,
    });
  }

  const unique = new Map(findings.map((f) => [f.code, f]));
  const merged = [...unique.values()];
  const score = scoreFromFindings(merged);
  const anomalies = merged.filter((f) => f.anomaly);
  const riskBand = bandFromScore(score, anomalies.length > 0);

  const methods = ["rules_engine"];
  if (args.azureConfigured) methods.unshift("azure_prebuilt_invoice");
  if (isolationRan) methods.push("isolation_forest");

  return {
    score,
    riskBand,
    reasonCodes: merged.map((f) => ({ code: f.code, message: f.message })),
    anomalyFlags: anomalies.map((f) => ({ code: f.code, message: f.message })),
    assessmentMethod: methods.join("+"),
    requiresManualReview: true,
    isolationForest: {
      ran: isolationRan,
      samples: historyFeatures.length,
      score: isolationScore,
      outlier: isolationOutlier,
    },
  };
}

export function extractedFromJson(value: unknown): ExtractedFields | null {
  if (!value || typeof value !== "object") return null;
  const fields = (value as { fields?: ExtractedFields }).fields;
  return fields ?? (value as ExtractedFields);
}
