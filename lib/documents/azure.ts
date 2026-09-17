import type { ExtractedFields } from "@/lib/risk/rules-engine";

export type ExtractionResult = {
  provider: string;
  status: "completed" | "needs_review" | "failed";
  fields: ExtractedFields;
  raw: unknown;
  processedAt: string;
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

type AzureField = {
  type?: string;
  content?: string;
  valueString?: string;
  valueDate?: string;
  valueNumber?: number;
  valueCurrency?: { amount?: number; currencyCode?: string };
  confidence?: number;
};

function fieldString(field?: AzureField) {
  return field?.valueString ?? field?.content ?? null;
}

function fieldDate(field?: AzureField) {
  return field?.valueDate ?? field?.content ?? null;
}

function fieldAmount(field?: AzureField) {
  if (field?.valueCurrency?.amount != null) return field.valueCurrency.amount;
  if (field?.valueNumber != null) return field.valueNumber;
  if (field?.content) {
    const n = Number(field.content.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30`;
    const start = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": input.mimeType,
      },
      body: input.bytes,
    });

    if (!start.ok) {
      const text = await start.text();
      return {
        provider: this.name,
        status: "failed",
        fields: {},
        raw: { httpStatus: start.status, body: text.slice(0, 2000) },
        processedAt: new Date().toISOString(),
      };
    }

    const operationLocation = start.headers.get("operation-location");
    if (!operationLocation) {
      return {
        provider: this.name,
        status: "failed",
        fields: {},
        raw: { reason: "Missing operation-location header." },
        processedAt: new Date().toISOString(),
      };
    }

    const result = await this.poll(operationLocation, key);
    const fields = result.analyzeResult?.documents?.[0]?.fields ?? {};
    const mapped: ExtractedFields = {
      invoiceNumber: fieldString(fields.InvoiceId),
      buyerName: fieldString(fields.CustomerName) ?? fieldString(fields.CustomerAddressRecipient),
      vendorName: fieldString(fields.VendorName),
      amount: fieldAmount(fields.InvoiceTotal),
      issueDate: fieldDate(fields.InvoiceDate),
      dueDate: fieldDate(fields.DueDate),
      purchaseOrder: fieldString(fields.PurchaseOrder),
      currency: fields.InvoiceTotal?.valueCurrency?.currencyCode ?? null,
      confidence: fields.InvoiceTotal?.confidence ?? fields.InvoiceId?.confidence ?? null,
    };

    const complete = Boolean(mapped.invoiceNumber || mapped.amount);
    return {
      provider: this.name,
      status: complete ? "completed" : "needs_review",
      fields: mapped,
      raw: {
        model: "prebuilt-invoice",
        filename: input.filename,
        status: result.status,
        fields,
      },
      processedAt: new Date().toISOString(),
    };
  }

  private async poll(url: string, key: string): Promise<AzureAnalyzeOperation> {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(url, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });
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
