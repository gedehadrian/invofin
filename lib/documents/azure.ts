import type { ExtractedFields } from "@/lib/risk/rules-engine";
import { normalizeAzureFields, type AzureField } from "./normalize";

export type ExtractionResult = {
  provider: string;
  status: "completed" | "needs_review" | "failed";
  fields: ExtractedFields;
  raw: unknown;
  processedAt: string;
  reviewReasons?: string[];
  confidenceByField?: Record<string, number | null>;
};

export interface DocumentExtractionProvider {
  readonly name: string;
  isConfigured(): boolean;
  extractInvoice(input: {
    bytes: ArrayBuffer;
    mimeType: string;
    filename: string;
  }): Promise<ExtractionResult>;
}

type AzureAnalyzeOperation = {
  status: string;
  analyzeResult?: {
    documents?: Array<{
      fields?: Record<string, AzureField>;
    }>;
  };
  error?: { message?: string };
};


const AZURE_ANALYZE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function failedResult(
  provider: string,
  raw: Record<string, unknown>,
): ExtractionResult {
  return {
    provider,
    status: "failed",
    fields: {},
    raw,
    processedAt: new Date().toISOString(),
  };
}

function isAzureOperationUrl(url: string, endpoint: string) {
  try {
    const operation = new URL(url);
    const origin = new URL(endpoint);
    if (operation.protocol !== "https:") return false;
    const host = operation.hostname.toLowerCase();
    return host === origin.hostname.toLowerCase() && operation.port === origin.port && !operation.username && !operation.password;
  } catch {
    return false;
  }
}

export class AzureDocumentIntelligenceProvider implements DocumentExtractionProvider {
  readonly name = "azure-document-intelligence:prebuilt-invoice";

  isConfigured() {
    return Boolean(
      process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
        process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
    );
  }

  async extractInvoice(input: {
    bytes: ArrayBuffer;
    mimeType: string;
    filename: string;
  }): Promise<ExtractionResult> {
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.replace(
      /\/$/,
      "",
    );
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    if (!endpoint || !key) {
      return {
        provider: this.name,
        status: "needs_review",
        fields: {},
        raw: { reason: "Azure Document Intelligence is not configured." },
        processedAt: new Date().toISOString(),
      };
    }

    if (!AZURE_ANALYZE_MIME.has(input.mimeType)) {
      return {
        provider: this.name,
        status: "needs_review",
        fields: {},
        raw: {
          reason:
            "Tipe berkas tidak didukung prebuilt-invoice. Unggah PDF, JPG, atau PNG.",
          mimeType: input.mimeType,
          filename: input.filename,
        },
        processedAt: new Date().toISOString(),
      };
    }

    try {
      const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30`;
      const start = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": input.mimeType,
        },
        body: input.bytes,
        signal: AbortSignal.timeout(20_000),
      });

      if (!start.ok) {
        const text = await start.text();
        return failedResult(this.name, {
          httpStatus: start.status,
          body: text.slice(0, 2000),
        });
      }

      const operationLocation = start.headers.get("operation-location");
      if (!operationLocation || !isAzureOperationUrl(operationLocation, endpoint)) {
        return failedResult(this.name, {
          reason: "Invalid or missing Azure operation-location header.",
        });
      }

      const result = await this.poll(operationLocation, key);
      if (result.status === "failed") {
        return failedResult(this.name, {
          status: result.status,
          error: result.error?.message ?? "Azure analyze failed.",
        });
      }

      const fields = result.analyzeResult?.documents?.[0]?.fields ?? {};
      const normalized = normalizeAzureFields(fields);
      return {
        provider: this.name,
        status: normalized.reviewReasons.length ? "needs_review" : "completed",
        fields: normalized.fields,
        reviewReasons: normalized.reviewReasons,
        confidenceByField: normalized.confidenceByField,
        raw: {
          model: "prebuilt-invoice",
          filename: input.filename,
          status: result.status,
          fields,
        },
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      return failedResult(this.name, {
        reason: error instanceof Error ? error.message : "Azure request failed.",
      });
    }
  }

  private async poll(url: string, key: string): Promise<AzureAnalyzeOperation> {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(url, {
        headers: { "Ocp-Apim-Subscription-Key": key },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text();
        return {
          status: "failed",
          error: { message: `Poll HTTP ${res.status}: ${body.slice(0, 300)}` },
        };
      }
      const json = (await res.json()) as AzureAnalyzeOperation;
      if (json.status === "succeeded" || json.status === "failed") return json;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return { status: "failed", error: { message: "Timed out waiting for Azure analyze." } };
  }
}

export class ManualExtractionProvider implements DocumentExtractionProvider {
  readonly name = "manual-review";
  isConfigured() {
    return true;
  }
  async extractInvoice(): Promise<ExtractionResult> {
    return {
      provider: this.name,
      status: "needs_review",
      fields: {},
      raw: {
        reason:
          "OCR Azure belum dikonfigurasi. Dokumen masuk extraction_review untuk konfirmasi manual.",
      },
      processedAt: new Date().toISOString(),
    };
  }
}

export function getExtractionProvider(): DocumentExtractionProvider {
  const azure = new AzureDocumentIntelligenceProvider();
  return azure.isConfigured() ? azure : new ManualExtractionProvider();
}
