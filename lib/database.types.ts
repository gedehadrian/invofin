export type OrganizationType = "vendor" | "buyer" | "lender" | "platform";
export type OrganizationStatus = "pending" | "active" | "suspended";
export type MemberRole = "vendor" | "buyer" | "lender" | "admin" | "risk_officer";
export type InvoiceStatus =
  | "draft"
  | "submitted"
  | "extraction_review"
  | "buyer_review"
  | "risk_review"
  | "eligible_for_funding"
  | "partially_funded"
  | "funded"
  | "rejected"
  | "repaid";
export type DocumentType = "invoice" | "purchase_order" | "bast" | "other";
export type ExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "needs_review"
  | "failed";
export type BuyerDecision = "confirmed" | "disputed";
export type RiskBand = "A" | "B" | "C" | "D" | "review";
export type RiskDecision = "approved" | "rejected";
export type FundingStatus = "open" | "filled" | "closed" | "cancelled";
export type CommitmentStatus = "committed" | "confirmed" | "cancelled";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          type: OrganizationType;
          tax_id: string | null;
          sector: string | null;
          status: OrganizationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: OrganizationType;
          tax_id?: string | null;
          sector?: string | null;
          status?: OrganizationStatus;
        };
        Update: {
          name?: string;
          tax_id?: string | null;
          sector?: string | null;
          status?: OrganizationStatus;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          is_primary?: boolean;
        };
        Update: {
          role?: MemberRole;
          is_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          vendor_org_id: string;
          buyer_org_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          amount: number;
          currency: string;
          description: string | null;
          requested_advance_percent: number | null;
          status: InvoiceStatus;
          created_by: string;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_org_id: string;
          buyer_org_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          amount: number;
          currency?: string;
          description?: string | null;
          requested_advance_percent?: number | null;
          status?: InvoiceStatus;
          created_by: string;
          submitted_at?: string | null;
        };
        Update: {
          buyer_org_id?: string;
          invoice_number?: string;
          issue_date?: string;
          due_date?: string;
          amount?: number;
          description?: string | null;
          requested_advance_percent?: number | null;
          status?: InvoiceStatus;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_vendor_org_id_fkey";
            columns: ["vendor_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_buyer_org_id_fkey";
            columns: ["buyer_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_documents: {
        Row: {
          id: string;
          invoice_id: string;
          document_type: DocumentType;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          sha256: string;
          extraction_status: ExtractionStatus;
          extracted_data: Json | null;
          extraction_provider: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          document_type: DocumentType;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          sha256: string;
          extraction_status?: ExtractionStatus;
          extracted_data?: Json | null;
          extraction_provider?: string | null;
          uploaded_by: string;
        };
        Update: {
          extraction_status?: ExtractionStatus;
          extracted_data?: Json | null;
          extraction_provider?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_documents_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_confirmations: {
        Row: {
          id: string;
          invoice_id: string;
          buyer_org_id: string;
          decision: BuyerDecision;
          confirmed_amount: number | null;
          confirmed_due_date: string | null;
          note: string | null;
          decided_by: string;
          decided_at: string;
        };
        Insert: {
          invoice_id: string;
          buyer_org_id: string;
          decision: BuyerDecision;
          confirmed_amount?: number | null;
          confirmed_due_date?: string | null;
          note?: string | null;
          decided_by: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "buyer_confirmations_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: true;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_assessments: {
        Row: {
          id: string;
          invoice_id: string;
          score: number;
          risk_band: RiskBand;
          reason_codes: Json;
          anomaly_flags: Json;
          assessment_method: string;
          requires_manual_review: boolean;
          decision: RiskDecision | null;
          decision_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          invoice_id: string;
          score: number;
          risk_band: RiskBand;
          reason_codes?: Json;
          anomaly_flags?: Json;
          assessment_method: string;
          requires_manual_review?: boolean;
          decision?: RiskDecision | null;
          decision_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          decision?: RiskDecision | null;
          decision_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "risk_assessments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      funding_opportunities: {
        Row: {
          id: string;
          invoice_id: string;
          target_amount: number;
          committed_amount: number;
          vendor_fee_percent: number;
          lender_return_percent: number;
          opens_at: string;
          closes_at: string;
          status: FundingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          invoice_id: string;
          target_amount: number;
          committed_amount?: number;
          vendor_fee_percent: number;
          lender_return_percent: number;
          opens_at: string;
          closes_at: string;
          status?: FundingStatus;
        };
        Update: {
          committed_amount?: number;
          status?: FundingStatus;
        };
        Relationships: [
          {
            foreignKeyName: "funding_opportunities_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: true;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      funding_commitments: {
        Row: {
          id: string;
          opportunity_id: string;
          lender_org_id: string;
          amount: number;
          status: CommitmentStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          opportunity_id: string;
          lender_org_id: string;
          amount: number;
          status?: CommitmentStatus;
          created_by: string;
        };
        Update: { status?: CommitmentStatus };
        Relationships: [
          {
            foreignKeyName: "funding_commitments_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "funding_opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      status_history: {
        Row: {
          id: string;
          invoice_id: string;
          from_status: string | null;
          to_status: string;
          note: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          invoice_id: string;
          from_status?: string | null;
          to_status: string;
          note?: string | null;
          changed_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "status_history_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          body: string;
          link?: string | null;
        };
        Update: { read_at?: string | null };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          organization_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          actor_user_id?: string | null;
          organization_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          ip_address?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_funding_commitment: {
        Args: { p_opportunity_id: string; p_amount: number };
        Returns: Database["public"]["Tables"]["funding_commitments"]["Row"];
      };
      duplicate_document_check: {
        Args: { p_sha256: string };
        Returns: {
          document_id: string;
          invoice_id: string;
          document_type: DocumentType;
          original_filename: string;
          created_at: string;
        }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_risk_officer: { Args: Record<string, never>; Returns: boolean };
      is_platform_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      organization_type: OrganizationType;
      organization_status: OrganizationStatus;
      member_role: MemberRole;
      invoice_status: InvoiceStatus;
      document_type: DocumentType;
      extraction_status: ExtractionStatus;
      buyer_decision: BuyerDecision;
      risk_band: RiskBand;
      risk_decision: RiskDecision;
      funding_status: FundingStatus;
      commitment_status: CommitmentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
  Database["public"]["Tables"]["organization_members"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceDocument =
  Database["public"]["Tables"]["invoice_documents"]["Row"];
export type BuyerConfirmation =
  Database["public"]["Tables"]["buyer_confirmations"]["Row"];
export type RiskAssessment =
  Database["public"]["Tables"]["risk_assessments"]["Row"];
export type FundingOpportunity =
  Database["public"]["Tables"]["funding_opportunities"]["Row"];
export type FundingCommitment =
  Database["public"]["Tables"]["funding_commitments"]["Row"];
export type StatusHistory = Database["public"]["Tables"]["status_history"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export type MembershipWithOrg = OrganizationMember & {
  organizations: Organization;
};
