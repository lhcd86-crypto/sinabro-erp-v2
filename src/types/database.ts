export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      additional_works: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          note: string | null
          photos: string[] | null
          project_id: string
          quantity: number | null
          status: string | null
          total_amount: number | null
          unit: string | null
          unit_price: number | null
          user_id: string | null
          work_date: string
          work_type: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          note?: string | null
          photos?: string[] | null
          project_id: string
          quantity?: number | null
          status?: string | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id?: string | null
          work_date: string
          work_type?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          note?: string | null
          photos?: string[] | null
          project_id?: string
          quantity?: number | null
          status?: string | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id?: string | null
          work_date?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "additional_works_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_works_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "additional_works_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_works_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_deposits: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string | null
          deposit_date: string | null
          depositor: string | null
          id: string
          method: string | null
          note: string | null
          notes: string | null
          processed_by: string | null
          project_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          deposit_date?: string | null
          depositor?: string | null
          id?: string
          method?: string | null
          note?: string | null
          notes?: string | null
          processed_by?: string | null
          project_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          deposit_date?: string | null
          depositor?: string | null
          id?: string
          method?: string | null
          note?: string | null
          notes?: string | null
          processed_by?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_deposits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "advance_deposits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_requests: {
        Row: {
          amount: number
          approval_chain: Json | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          current_step: string | null
          deposited_at: string | null
          id: string
          needed_date: string | null
          project_id: string | null
          purpose: string | null
          reason: string | null
          reject_reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_step?: string | null
          deposited_at?: string | null
          id?: string
          needed_date?: string | null
          project_id?: string | null
          purpose?: string | null
          reason?: string | null
          reject_reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          current_step?: string | null
          deposited_at?: string | null
          id?: string
          needed_date?: string | null
          project_id?: string | null
          purpose?: string | null
          reason?: string | null
          reject_reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "advance_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      advances: {
        Row: {
          actual_amount: number | null
          admin_note: string | null
          amount: number
          approval_chain: Json | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string | null
          current_step: string | null
          detail: string | null
          id: string
          project_id: string
          receipt_type: string | null
          receipt_url: string | null
          refund_amount: number | null
          request_date: string
          requester_name: string | null
          settled_amount: number | null
          settled_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          actual_amount?: number | null
          admin_note?: string | null
          amount?: number
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          current_step?: string | null
          detail?: string | null
          id?: string
          project_id: string
          receipt_type?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
          request_date: string
          requester_name?: string | null
          settled_amount?: number | null
          settled_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          actual_amount?: number | null
          admin_note?: string | null
          amount?: number
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          current_step?: string | null
          detail?: string | null
          id?: string
          project_id?: string
          receipt_type?: string | null
          receipt_url?: string | null
          refund_amount?: number | null
          request_date?: string
          requester_name?: string | null
          settled_amount?: number | null
          settled_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advances_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "advances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string | null
          id: string
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          ann_type: string | null
          content: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          expire_date: string | null
          id: string
          target: string | null
          title: string
        }
        Insert: {
          ann_type?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expire_date?: string | null
          id?: string
          target?: string | null
          title: string
        }
        Update: {
          ann_type?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expire_date?: string | null
          id?: string
          target?: string | null
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      approved_devices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          device_fp: string
          device_name: string | null
          id: string
          last_login_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          device_fp: string
          device_name?: string | null
          id?: string
          last_login_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          device_fp?: string
          device_name?: string | null
          id?: string
          last_login_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attendance_exceptions: {
        Row: {
          absent_hours: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          exception_date: string
          exception_type: string
          id: string
          project_id: string | null
          reason: string | null
          status: string | null
          time_from: string | null
          time_to: string | null
          user_id: string | null
        }
        Insert: {
          absent_hours?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          exception_date?: string
          exception_type?: string
          id?: string
          project_id?: string | null
          reason?: string | null
          status?: string | null
          time_from?: string | null
          time_to?: string | null
          user_id?: string | null
        }
        Update: {
          absent_hours?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          exception_date?: string
          exception_type?: string
          id?: string
          project_id?: string | null
          reason?: string | null
          status?: string | null
          time_from?: string | null
          time_to?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_exceptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "attendance_exceptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          changed_by: string | null
          changed_by_name: string | null
          changes: Json | null
          created_at: string | null
          id: string
          prev_values: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          prev_values?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          prev_values?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      billing_status: {
        Row: {
          approved_amount: number | null
          created_at: string | null
          created_by: string | null
          id: string
          note: string | null
          paid_amount: number | null
          period: string | null
          project_id: string | null
          request_amount: number | null
          round: number
          stages: Json | null
        }
        Insert: {
          approved_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          paid_amount?: number | null
          period?: string | null
          project_id?: string | null
          request_amount?: number | null
          round: number
          stages?: Json | null
        }
        Update: {
          approved_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          paid_amount?: number | null
          period?: string | null
          project_id?: string | null
          request_amount?: number | null
          round?: number
          stages?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billing_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      billings: {
        Row: {
          billing_date: string
          billing_no: string | null
          claim_amount: number | null
          created_at: string | null
          expected_payment_date: string | null
          id: string
          note: string | null
          period_from: string | null
          period_to: string | null
          project_id: string
          received_amount: number | null
          received_date: string | null
          status: string | null
        }
        Insert: {
          billing_date: string
          billing_no?: string | null
          claim_amount?: number | null
          created_at?: string | null
          expected_payment_date?: string | null
          id?: string
          note?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id: string
          received_amount?: number | null
          received_date?: string | null
          status?: string | null
        }
        Update: {
          billing_date?: string
          billing_no?: string | null
          claim_amount?: number | null
          created_at?: string | null
          expected_payment_date?: string | null
          id?: string
          note?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id?: string
          received_amount?: number | null
          received_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          actual_amount: number | null
          budget_amount: number | null
          category: string
          created_at: string | null
          id: string
          notes: string | null
          project_id: string | null
        }
        Insert: {
          actual_amount?: number | null
          budget_amount?: number | null
          category: string
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
        }
        Update: {
          actual_amount?: number | null
          budget_amount?: number | null
          category?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_type: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          organization: string | null
          phone: string | null
          project_id: string | null
          role: string | null
        }
        Insert: {
          contact_type?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          organization?: string | null
          phone?: string | null
          project_id?: string | null
          role?: string | null
        }
        Update: {
          contact_type?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          organization?: string | null
          phone?: string | null
          project_id?: string | null
          role?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_amount: number | null
          contract_date: string | null
          contract_no: string | null
          created_at: string | null
          doc_url: string | null
          id: string
          note: string | null
          payment_terms: string | null
          project_id: string
          scope: string | null
          status: string | null
        }
        Insert: {
          contract_amount?: number | null
          contract_date?: string | null
          contract_no?: string | null
          created_at?: string | null
          doc_url?: string | null
          id?: string
          note?: string | null
          payment_terms?: string | null
          project_id: string
          scope?: string | null
          status?: string | null
        }
        Update: {
          contract_amount?: number | null
          contract_date?: string | null
          contract_no?: string | null
          created_at?: string | null
          doc_url?: string | null
          id?: string
          note?: string | null
          payment_terms?: string | null
          project_id?: string
          scope?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_budgets: {
        Row: {
          etc_budget: number | null
          id: string
          indirect_rate: number | null
          labor_budget: number | null
          mat_budget: number | null
          project_id: string
          total_budget: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          etc_budget?: number | null
          id?: string
          indirect_rate?: number | null
          labor_budget?: number | null
          mat_budget?: number | null
          project_id: string
          total_budget?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          etc_budget?: number | null
          id?: string
          indirect_rate?: number | null
          labor_budget?: number | null
          mat_budget?: number | null
          project_id?: string
          total_budget?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          cost_date: string
          cost_type: string | null
          created_at: string | null
          id: string
          item_name: string
          note: string | null
          paid_status: string | null
          project_id: string
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number
          cost_date: string
          cost_type?: string | null
          created_at?: string | null
          id?: string
          item_name: string
          note?: string | null
          paid_status?: string | null
          project_id: string
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          cost_date?: string
          cost_type?: string | null
          created_at?: string | null
          id?: string
          item_name?: string
          note?: string | null
          paid_status?: string | null
          project_id?: string
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_labor_cost: {
        Row: {
          id: string
          project_id: string | null
          report_date: string
          total_labor_cost: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          report_date: string
          total_labor_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          report_date?: string
          total_labor_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_labor_cost_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_labor_cost_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          confirmed: boolean | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          direct_ot: number | null
          direct_worker: number | null
          direct_worker_am: number | null
          direct_worker_ni: number | null
          direct_worker_pm: number | null
          extra_materials: Json | null
          id: string
          indirect_ot: number | null
          indirect_worker: number | null
          indirect_worker_am: number | null
          indirect_worker_ni: number | null
          indirect_worker_pm: number | null
          location: string | null
          note: string | null
          photo_urls: string[] | null
          project_id: string
          qty_db2015: number | null
          qty_hlm: number | null
          qty_m230: number | null
          qty_other: number | null
          qty_sv250: number | null
          qty_v250: number | null
          report_date: string
          revision_at: string | null
          revision_by: string | null
          revision_by_name: string | null
          revision_comment: string | null
          revision_requested: boolean | null
          user_id: string | null
          vn_engineer: number | null
          vn_engineer_am: number | null
          vn_engineer_ni: number | null
          vn_engineer_pm: number | null
          weather: string | null
          work_desc: string | null
          work_type: string | null
        }
        Insert: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          direct_ot?: number | null
          direct_worker?: number | null
          direct_worker_am?: number | null
          direct_worker_ni?: number | null
          direct_worker_pm?: number | null
          extra_materials?: Json | null
          id?: string
          indirect_ot?: number | null
          indirect_worker?: number | null
          indirect_worker_am?: number | null
          indirect_worker_ni?: number | null
          indirect_worker_pm?: number | null
          location?: string | null
          note?: string | null
          photo_urls?: string[] | null
          project_id: string
          qty_db2015?: number | null
          qty_hlm?: number | null
          qty_m230?: number | null
          qty_other?: number | null
          qty_sv250?: number | null
          qty_v250?: number | null
          report_date: string
          revision_at?: string | null
          revision_by?: string | null
          revision_by_name?: string | null
          revision_comment?: string | null
          revision_requested?: boolean | null
          user_id?: string | null
          vn_engineer?: number | null
          vn_engineer_am?: number | null
          vn_engineer_ni?: number | null
          vn_engineer_pm?: number | null
          weather?: string | null
          work_desc?: string | null
          work_type?: string | null
        }
        Update: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          direct_ot?: number | null
          direct_worker?: number | null
          direct_worker_am?: number | null
          direct_worker_ni?: number | null
          direct_worker_pm?: number | null
          extra_materials?: Json | null
          id?: string
          indirect_ot?: number | null
          indirect_worker?: number | null
          indirect_worker_am?: number | null
          indirect_worker_ni?: number | null
          indirect_worker_pm?: number | null
          location?: string | null
          note?: string | null
          photo_urls?: string[] | null
          project_id?: string
          qty_db2015?: number | null
          qty_hlm?: number | null
          qty_m230?: number | null
          qty_other?: number | null
          qty_sv250?: number | null
          qty_v250?: number | null
          report_date?: string
          revision_at?: string | null
          revision_by?: string | null
          revision_by_name?: string | null
          revision_comment?: string | null
          revision_requested?: boolean | null
          user_id?: string | null
          vn_engineer?: number | null
          vn_engineer_am?: number | null
          vn_engineer_ni?: number | null
          vn_engineer_pm?: number | null
          weather?: string | null
          work_desc?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      defect_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          detail: string | null
          id: string
          location: string | null
          photo_urls: string[] | null
          project_id: string | null
          severity: string | null
          stage: string | null
          symptom: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          detail?: string | null
          id?: string
          location?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          severity?: string | null
          stage?: string | null
          symptom?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          detail?: string | null
          id?: string
          location?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          severity?: string | null
          stage?: string | null
          symptom?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "defect_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "defect_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      defects: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          photo_urls: string[] | null
          project_id: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      delegation_rules: {
        Row: {
          created_at: string | null
          delegate_id: string | null
          delegate_name: string | null
          delegator_id: string | null
          delegator_name: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          delegate_id?: string | null
          delegate_name?: string | null
          delegator_id?: string | null
          delegator_name?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          delegate_id?: string | null
          delegate_name?: string | null
          delegator_id?: string | null
          delegator_name?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
        }
        Relationships: []
      }
      doc_expiry: {
        Row: {
          created_at: string | null
          doc_type: string | null
          expiry_date: string
          id: string
          note: string | null
          person: string | null
          project_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          doc_type?: string | null
          expiry_date: string
          id?: string
          note?: string | null
          person?: string | null
          project_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string | null
          expiry_date?: string
          id?: string
          note?: string | null
          person?: string | null
          project_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_expiry_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "doc_expiry_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_attendance: {
        Row: {
          check_in: string | null
          check_in_photo: string | null
          check_out: string | null
          check_out_photo: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          checkout_lat: number | null
          checkout_lng: number | null
          checkout_memo: string | null
          checkout_photo_url: string | null
          created_at: string | null
          driver_id: string
          id: string
          memo: string | null
          photo_url: string | null
          user_id: string | null
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_in_photo?: string | null
          check_out?: string | null
          check_out_photo?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          checkout_memo?: string | null
          checkout_photo_url?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          memo?: string | null
          photo_url?: string | null
          user_id?: string | null
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_in_photo?: string | null
          check_out?: string | null
          check_out_photo?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          checkout_memo?: string | null
          checkout_photo_url?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          memo?: string | null
          photo_url?: string | null
          user_id?: string | null
          work_date?: string
        }
        Relationships: []
      }
      driver_expenses: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          expense_date: string | null
          id: string
          memo: string | null
          receipt_type: string | null
          receipt_url: string | null
          status: string | null
          submitted_by: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          expense_date?: string | null
          id?: string
          memo?: string | null
          receipt_type?: string | null
          receipt_url?: string | null
          status?: string | null
          submitted_by: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          expense_date?: string | null
          id?: string
          memo?: string | null
          receipt_type?: string | null
          receipt_url?: string | null
          status?: string | null
          submitted_by?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_attendance: {
        Row: {
          check_in: string | null
          check_method: string | null
          check_out: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          checkout_lat: number | null
          checkout_lng: number | null
          checkout_memo: string | null
          checkout_photo_url: string | null
          created_at: string | null
          id: string
          is_night: boolean | null
          is_weekend: boolean | null
          memo: string | null
          overtime_hours: number | null
          photo_url: string | null
          project_id: string | null
          user_id: string | null
          work_date: string | null
          work_hours: number | null
        }
        Insert: {
          check_in?: string | null
          check_method?: string | null
          check_out?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          checkout_memo?: string | null
          checkout_photo_url?: string | null
          created_at?: string | null
          id?: string
          is_night?: boolean | null
          is_weekend?: boolean | null
          memo?: string | null
          overtime_hours?: number | null
          photo_url?: string | null
          project_id?: string | null
          user_id?: string | null
          work_date?: string | null
          work_hours?: number | null
        }
        Update: {
          check_in?: string | null
          check_method?: string | null
          check_out?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          checkout_memo?: string | null
          checkout_photo_url?: string | null
          created_at?: string | null
          id?: string
          is_night?: boolean | null
          is_weekend?: boolean | null
          memo?: string | null
          overtime_hours?: number | null
          photo_url?: string | null
          project_id?: string | null
          user_id?: string | null
          work_date?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "employee_attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          project_id: string | null
          serial_number: string | null
          status: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          project_id?: string | null
          serial_number?: string | null
          status?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          project_id?: string | null
          serial_number?: string | null
          status?: string | null
        }
        Relationships: []
      }
      equipment_items: {
        Row: {
          category: string | null
          created_at: string | null
          current_location: string | null
          current_project_id: string | null
          id: string
          last_moved_at: string | null
          manufacturer: string | null
          name: string
          note: string | null
          photo_url: string | null
          product_code: string | null
          project_id: string | null
          purchase_date: string | null
          qty: number | null
          registered_by: string | null
          registered_by_name: string | null
          status: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_location?: string | null
          current_project_id?: string | null
          id?: string
          last_moved_at?: string | null
          manufacturer?: string | null
          name: string
          note?: string | null
          photo_url?: string | null
          product_code?: string | null
          project_id?: string | null
          purchase_date?: string | null
          qty?: number | null
          registered_by?: string | null
          registered_by_name?: string | null
          status?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_location?: string | null
          current_project_id?: string | null
          id?: string
          last_moved_at?: string | null
          manufacturer?: string | null
          name?: string
          note?: string | null
          photo_url?: string | null
          product_code?: string | null
          project_id?: string | null
          purchase_date?: string | null
          qty?: number | null
          registered_by?: string | null
          registered_by_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_items_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_items_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_repairs: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string | null
          detail: string | null
          equipment_id: string | null
          equipment_name: string | null
          id: string
          photo_url: string | null
          project_id: string | null
          registered_by: string | null
          registered_by_name: string | null
          repair_date: string
          repair_type: string | null
          result: string | null
          vendor: string | null
          vendor_phone: string | null
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          detail?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          photo_url?: string | null
          project_id?: string | null
          registered_by?: string | null
          registered_by_name?: string | null
          repair_date?: string
          repair_type?: string | null
          result?: string | null
          vendor?: string | null
          vendor_phone?: string | null
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          detail?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          photo_url?: string | null
          project_id?: string | null
          registered_by?: string | null
          registered_by_name?: string | null
          repair_date?: string
          repair_type?: string | null
          result?: string | null
          vendor?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_repairs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_repairs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_requests: {
        Row: {
          approval_chain: Json | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string | null
          current_step: string | null
          delivery_date: string | null
          delivery_note: string | null
          desired_date: string | null
          id: string
          item_name: string
          note: string | null
          project_id: string | null
          qty: number | null
          reason: string | null
          received_at: string | null
          received_by: string | null
          received_photo: string | null
          reject_reason: string | null
          requested_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          current_step?: string | null
          delivery_date?: string | null
          delivery_note?: string | null
          desired_date?: string | null
          id?: string
          item_name: string
          note?: string | null
          project_id?: string | null
          qty?: number | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          received_photo?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          current_step?: string | null
          delivery_date?: string | null
          delivery_note?: string | null
          desired_date?: string | null
          id?: string
          item_name?: string
          note?: string | null
          project_id?: string | null
          qty?: number | null
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          received_photo?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_shares: {
        Row: {
          approved_by: string | null
          created_at: string | null
          from_project_id: string | null
          id: string
          item_name: string
          reason: string | null
          received_at: string | null
          received_by: string | null
          requested_by: string | null
          requested_by_name: string | null
          status: string | null
          to_project_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          from_project_id?: string | null
          id?: string
          item_name: string
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string | null
          to_project_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          from_project_id?: string | null
          id?: string
          item_name?: string
          reason?: string | null
          received_at?: string | null
          received_by?: string | null
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string | null
          to_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_shares_from_project_id_fkey"
            columns: ["from_project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_shares_from_project_id_fkey"
            columns: ["from_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_shares_to_project_id_fkey"
            columns: ["to_project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_shares_to_project_id_fkey"
            columns: ["to_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_transfers: {
        Row: {
          created_at: string | null
          equipment_id: string | null
          equipment_name: string | null
          from_location: string | null
          id: string
          note: string | null
          to_location: string | null
          transfer_date: string | null
          transferred_by: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          from_location?: string | null
          id?: string
          note?: string | null
          to_location?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string | null
          equipment_name?: string | null
          from_location?: string | null
          id?: string
          note?: string | null
          to_location?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_transfers_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          approval_chain: Json | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          current_step: string | null
          description: string | null
          doc_url: string | null
          expense_date: string | null
          grand_total: number | null
          id: string
          invoice_number: string | null
          invoice_type: string | null
          item_name: string
          note: string | null
          project_id: string | null
          qty: number | null
          quantity: number | null
          receipt_url: string | null
          reject_reason: string | null
          status: string | null
          submitted_by: string | null
          submitted_role: string | null
          total_amount: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          vat_amount: number | null
          vat_rate: number | null
          vendor: string | null
        }
        Insert: {
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          current_step?: string | null
          description?: string | null
          doc_url?: string | null
          expense_date?: string | null
          grand_total?: number | null
          id?: string
          invoice_number?: string | null
          invoice_type?: string | null
          item_name: string
          note?: string | null
          project_id?: string | null
          qty?: number | null
          quantity?: number | null
          receipt_url?: string | null
          reject_reason?: string | null
          status?: string | null
          submitted_by?: string | null
          submitted_role?: string | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          vendor?: string | null
        }
        Update: {
          approval_chain?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          current_step?: string | null
          description?: string | null
          doc_url?: string | null
          expense_date?: string | null
          grand_total?: number | null
          id?: string
          invoice_number?: string | null
          invoice_type?: string | null
          item_name?: string
          note?: string | null
          project_id?: string | null
          qty?: number | null
          quantity?: number | null
          receipt_url?: string | null
          reject_reason?: string | null
          status?: string | null
          submitted_by?: string | null
          submitted_role?: string | null
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          photo_url: string
          project_id: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          photo_url: string
          project_id?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          photo_url?: string
          project_id?: string | null
        }
        Relationships: []
      }
      gps_logs: {
        Row: {
          id: string
          lat: number
          lng: number
          logged_at: string | null
          page: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          logged_at?: string | null
          page?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          logged_at?: string | null
          page?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string | null
          current_stock: number | null
          id: string
          location: string | null
          min_stock: number | null
          name: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          id?: string
          location?: string | null
          min_stock?: number | null
          name: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          id?: string
          location?: string | null
          min_stock?: number | null
          name?: string
          unit?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_location: string | null
          id: string
          item_name: string
          note: string | null
          qty: number | null
          slip_no: string | null
          to_location: string | null
          txn_date: string | null
          txn_type: string | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_location?: string | null
          id?: string
          item_name: string
          note?: string | null
          qty?: number | null
          slip_no?: string | null
          to_location?: string | null
          txn_date?: string | null
          txn_type?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_location?: string | null
          id?: string
          item_name?: string
          note?: string | null
          qty?: number | null
          slip_no?: string | null
          to_location?: string | null
          txn_date?: string | null
          txn_type?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: []
      }
      labor_contracts: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          daily_rate: number | null
          end_date: string | null
          id: string
          position: string | null
          project_id: string | null
          signature_url: string | null
          start_date: string | null
          worker_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          daily_rate?: number | null
          end_date?: string | null
          id?: string
          position?: string | null
          project_id?: string | null
          signature_url?: string | null
          start_date?: string | null
          worker_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          daily_rate?: number | null
          end_date?: string | null
          id?: string
          position?: string | null
          project_id?: string | null
          signature_url?: string | null
          start_date?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "labor_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          created_at: string | null
          daily_rate: number
          effective_from: string
          id: string
          note: string | null
          ot_hourly: number | null
          project_id: string
          worker_type: string
        }
        Insert: {
          created_at?: string | null
          daily_rate?: number
          effective_from?: string
          id?: string
          note?: string | null
          ot_hourly?: number | null
          project_id: string
          worker_type: string
        }
        Update: {
          created_at?: string | null
          daily_rate?: number
          effective_from?: string
          id?: string
          note?: string | null
          ot_hourly?: number | null
          project_id?: string
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "labor_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          id: string
          total_days: number | null
          updated_at: string | null
          used_days: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          total_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          total_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          end_date: string
          half_day: string | null
          id: string
          leave_days: number | null
          leave_type: string
          project_id: string | null
          reason: string | null
          reject_reason: string | null
          start_date: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          end_date: string
          half_day?: string | null
          id?: string
          leave_days?: number | null
          leave_type?: string
          project_id?: string | null
          reason?: string | null
          reject_reason?: string | null
          start_date: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          end_date?: string
          half_day?: string | null
          id?: string
          leave_days?: number | null
          leave_type?: string
          project_id?: string | null
          reason?: string | null
          reject_reason?: string | null
          start_date?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "leave_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      login_photos: {
        Row: {
          created_at: string | null
          face_match: string | null
          id: number
          logged_at: string | null
          photo_url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          face_match?: string | null
          id?: never
          logged_at?: string | null
          photo_url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          face_match?: string | null
          id?: never
          logged_at?: string | null
          photo_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      material_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          min_qty: number | null
          name: string
          notes: string | null
          project_id: string | null
          stock_qty: number | null
          unit: string | null
          unit_price: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          min_qty?: number | null
          name: string
          notes?: string | null
          project_id?: string | null
          stock_qty?: number | null
          unit?: string | null
          unit_price?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          min_qty?: number | null
          name?: string
          notes?: string | null
          project_id?: string | null
          stock_qty?: number | null
          unit?: string | null
          unit_price?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
      material_orders: {
        Row: {
          approval_chain: Json | null
          created_at: string | null
          created_by: string | null
          current_step: string | null
          eta: string | null
          expected_date: string | null
          id: string
          install_location: string | null
          item_name: string
          need_date: string | null
          order_date: string | null
          project_id: string | null
          quantity: number
          reason: string | null
          received_at: string | null
          received_photo_url: string | null
          reject_reason: string | null
          requested_by: string | null
          stages: Json | null
          status: string | null
          unit: string | null
          updated_at: string | null
          urgency: string | null
          vendor: string | null
        }
        Insert: {
          approval_chain?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          eta?: string | null
          expected_date?: string | null
          id?: string
          install_location?: string | null
          item_name: string
          need_date?: string | null
          order_date?: string | null
          project_id?: string | null
          quantity: number
          reason?: string | null
          received_at?: string | null
          received_photo_url?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          stages?: Json | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          urgency?: string | null
          vendor?: string | null
        }
        Update: {
          approval_chain?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_step?: string | null
          eta?: string | null
          expected_date?: string | null
          id?: string
          install_location?: string | null
          item_name?: string
          need_date?: string | null
          order_date?: string | null
          project_id?: string | null
          quantity?: number
          reason?: string | null
          received_at?: string | null
          received_photo_url?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          stages?: Json | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          urgency?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_stock: {
        Row: {
          balance: number | null
          id: string
          material_name: string | null
          project_id: string | null
          total_in: number | null
          total_out: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          id?: string
          material_name?: string | null
          project_id?: string | null
          total_in?: number | null
          total_out?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          material_name?: string | null
          project_id?: string | null
          total_in?: number | null
          total_out?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_stock_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_stock_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          material_id: string | null
          notes: string | null
          project_id: string | null
          quantity: number | null
          transaction_date: string | null
          transaction_type: string | null
          unit_price: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          project_id?: string | null
          quantity?: number | null
          transaction_date?: string | null
          transaction_type?: string | null
          unit_price?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          project_id?: string | null
          quantity?: number | null
          transaction_date?: string | null
          transaction_type?: string | null
          unit_price?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string | null
          id: string
          material_name: string
          note: string | null
          project_id: string
          quantity: number
          total_amount: number | null
          tx_date: string
          tx_type: string
          unit: string | null
          unit_price: number | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_name: string
          note?: string | null
          project_id: string
          quantity?: number
          total_amount?: number | null
          tx_date: string
          tx_type: string
          unit?: string | null
          unit_price?: number | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_name?: string
          note?: string | null
          project_id?: string
          quantity?: number
          total_amount?: number | null
          tx_date?: string
          tx_type?: string
          unit?: string | null
          unit_price?: number | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closes: {
        Row: {
          checklist: Json | null
          closed_at: string | null
          closed_by: string | null
          id: string
          month: string
          notes: string | null
          project_id: string | null
        }
        Insert: {
          checklist?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          month: string
          notes?: string | null
          project_id?: string | null
        }
        Update: {
          checklist?: Json | null
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          month?: string
          notes?: string | null
          project_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          read: boolean | null
          target_roles: string[] | null
          target_user_id: string | null
          title: string | null
          type: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          read?: boolean | null
          target_roles?: string[] | null
          target_user_id?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          read?: boolean | null
          target_roles?: string[] | null
          target_user_id?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      prepayments: {
        Row: {
          amount: number
          created_at: string | null
          deducted: number | null
          description: string | null
          id: string
          note: string | null
          project_id: string
          recv_date: string
          status: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          deducted?: number | null
          description?: string | null
          id?: string
          note?: string | null
          project_id: string
          recv_date: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deducted?: number | null
          description?: string | null
          id?: string
          note?: string | null
          project_id?: string
          recv_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prepayments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prepayments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          item_name: string
          notes: string | null
          project_id: string | null
          purchase_date: string | null
          qty: number | null
          quantity: number | null
          source: string | null
          unit: string | null
          unit_price: number
          vendor: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name: string
          notes?: string | null
          project_id?: string | null
          purchase_date?: string | null
          qty?: number | null
          quantity?: number | null
          source?: string | null
          unit?: string | null
          unit_price: number
          vendor?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          project_id?: string | null
          purchase_date?: string | null
          qty?: number | null
          quantity?: number | null
          source?: string | null
          unit?: string | null
          unit_price?: number
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress: {
        Row: {
          breakdown: Json | null
          id: string
          overall_progress: number | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          breakdown?: Json | null
          id?: string
          overall_progress?: number | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          breakdown?: Json | null
          id?: string
          overall_progress?: number | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_quantities: {
        Row: {
          contract_qty: number
          created_at: string | null
          id: string
          note: string | null
          project_id: string
          settlement_qty: number | null
          unit: string
          unit_price: number | null
          work_type: string
        }
        Insert: {
          contract_qty?: number
          created_at?: string | null
          id?: string
          note?: string | null
          project_id: string
          settlement_qty?: number | null
          unit: string
          unit_price?: number | null
          work_type: string
        }
        Update: {
          contract_qty?: number
          created_at?: string | null
          id?: string
          note?: string | null
          project_id?: string
          settlement_qty?: number | null
          unit?: string
          unit_price?: number | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_quantities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_quantities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          project_id: string | null
          token: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          token: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_workers: {
        Row: {
          assigned_date: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          project_id: string
          worker_id: string
        }
        Insert: {
          assigned_date?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id: string
          worker_id: string
        }
        Update: {
          assigned_date?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          code: string
          commence_date: string | null
          complete_date: string | null
          completion_date: string | null
          contract_amount: number | null
          contract_date: string | null
          contract_name: string | null
          contractor: string | null
          created_at: string | null
          end_date: string | null
          geo_lat: number | null
          geo_lng: number | null
          geo_radius: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          ld_rate: number | null
          location: string | null
          manager_id: string | null
          manager2_id: string | null
          name: string
          paid_amount: number | null
          progress_rate: number | null
          project_no: number | null
          remarks: string | null
          settlement_amount: number | null
          site_lat: number | null
          site_lng: number | null
          site_radius: number | null
          start_date: string | null
          status: string | null
          warranty_months: number | null
          warranty_start: string | null
        }
        Insert: {
          client?: string | null
          code: string
          commence_date?: string | null
          complete_date?: string | null
          completion_date?: string | null
          contract_amount?: number | null
          contract_date?: string | null
          contract_name?: string | null
          contractor?: string | null
          created_at?: string | null
          end_date?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          geo_radius?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ld_rate?: number | null
          location?: string | null
          manager_id?: string | null
          manager2_id?: string | null
          name: string
          paid_amount?: number | null
          progress_rate?: number | null
          project_no?: number | null
          remarks?: string | null
          settlement_amount?: number | null
          site_lat?: number | null
          site_lng?: number | null
          site_radius?: number | null
          start_date?: string | null
          status?: string | null
          warranty_months?: number | null
          warranty_start?: string | null
        }
        Update: {
          client?: string | null
          code?: string
          commence_date?: string | null
          complete_date?: string | null
          completion_date?: string | null
          contract_amount?: number | null
          contract_date?: string | null
          contract_name?: string | null
          contractor?: string | null
          created_at?: string | null
          end_date?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          geo_radius?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ld_rate?: number | null
          location?: string | null
          manager_id?: string | null
          manager2_id?: string | null
          name?: string
          paid_amount?: number | null
          progress_rate?: number | null
          project_no?: number | null
          remarks?: string | null
          settlement_amount?: number | null
          site_lat?: number | null
          site_lng?: number | null
          site_radius?: number | null
          start_date?: string | null
          status?: string | null
          warranty_months?: number | null
          warranty_start?: string | null
        }
        Relationships: []
      }
      quality_inspections: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          project_id: string | null
          stages: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          stages?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          stages?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quantity_items: {
        Row: {
          contract_qty: number | null
          created_at: string | null
          created_by: string | null
          executed_qty: number | null
          id: string
          item_name: string
          notes: string | null
          project_id: string | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          contract_qty?: number | null
          created_at?: string | null
          created_by?: string | null
          executed_qty?: number | null
          id?: string
          item_name: string
          notes?: string | null
          project_id?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          contract_qty?: number | null
          created_at?: string | null
          created_by?: string | null
          executed_qty?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          project_id?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          cycle: string | null
          description: string
          id: string
          is_active: boolean | null
          next_run: string | null
          project_id: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          next_run?: string | null
          project_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          next_run?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recurring_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_inspections: {
        Row: {
          checklist: Json | null
          created_at: string | null
          id: string
          inspection_date: string | null
          inspector_id: string | null
          notes: string | null
          photo_urls: string[] | null
          project_id: string | null
          unchecked_items: string[] | null
        }
        Insert: {
          checklist?: Json | null
          created_at?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          unchecked_items?: string[] | null
        }
        Update: {
          checklist?: Json | null
          created_at?: string | null
          id?: string
          inspection_date?: string | null
          inspector_id?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          unchecked_items?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_monthly: {
        Row: {
          allowances: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          exception_deduction: number | null
          id: string
          insurance_deduction: number | null
          meal_total: number | null
          month: string | null
          net_total: number | null
          ot_hours: number | null
          ot_pay: number | null
          other_bonus: number | null
          other_deduction: number | null
          probation_days: number | null
          probation_pay: number | null
          regular_days: number | null
          regular_pay: number | null
          tax: number | null
          user_id: string | null
        }
        Insert: {
          allowances?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          exception_deduction?: number | null
          id?: string
          insurance_deduction?: number | null
          meal_total?: number | null
          month?: string | null
          net_total?: number | null
          ot_hours?: number | null
          ot_pay?: number | null
          other_bonus?: number | null
          other_deduction?: number | null
          probation_days?: number | null
          probation_pay?: number | null
          regular_days?: number | null
          regular_pay?: number | null
          tax?: number | null
          user_id?: string | null
        }
        Update: {
          allowances?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          exception_deduction?: number | null
          id?: string
          insurance_deduction?: number | null
          meal_total?: number | null
          month?: string | null
          net_total?: number | null
          ot_hours?: number | null
          ot_pay?: number | null
          other_bonus?: number | null
          other_deduction?: number | null
          probation_days?: number | null
          probation_pay?: number | null
          regular_days?: number | null
          regular_pay?: number | null
          tax?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      salary_settings: {
        Row: {
          base_amount: number | null
          bhtn_rate: number | null
          bhxh_rate: number | null
          bhyt_rate: number | null
          created_at: string | null
          female_allowance: number | null
          id: string
          insurance_base_amount: number | null
          meal_allowance: number | null
          overtime_rate: number | null
          probation_rate: number | null
          probation_salary: number | null
          responsibility_allowance: number | null
          salary_type: string | null
          site_allowance: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_amount?: number | null
          bhtn_rate?: number | null
          bhxh_rate?: number | null
          bhyt_rate?: number | null
          created_at?: string | null
          female_allowance?: number | null
          id?: string
          insurance_base_amount?: number | null
          meal_allowance?: number | null
          overtime_rate?: number | null
          probation_rate?: number | null
          probation_salary?: number | null
          responsibility_allowance?: number | null
          salary_type?: string | null
          site_allowance?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_amount?: number | null
          bhtn_rate?: number | null
          bhxh_rate?: number | null
          bhyt_rate?: number | null
          created_at?: string | null
          female_allowance?: number | null
          id?: string
          insurance_base_amount?: number | null
          meal_allowance?: number | null
          overtime_rate?: number | null
          probation_rate?: number | null
          probation_salary?: number | null
          responsibility_allowance?: number | null
          salary_type?: string | null
          site_allowance?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          assignee: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          progress: number | null
          project_id: string | null
          start_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          progress?: number | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          progress?: number | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          location: string | null
          note: string | null
          plan_end: string
          plan_start: string
          planned_qty: number | null
          progress: number | null
          project_id: string
          sort_order: number | null
          status: string | null
          task_name: string
          unit: string | null
          updated_at: string | null
          user_id: string | null
          work_type: string
          zone: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          note?: string | null
          plan_end: string
          plan_start: string
          planned_qty?: number | null
          progress?: number | null
          project_id: string
          sort_order?: number | null
          status?: string | null
          task_name: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_type: string
          zone?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          note?: string | null
          plan_end?: string
          plan_start?: string
          planned_qty?: number | null
          progress?: number | null
          project_id?: string
          sort_order?: number | null
          status?: string | null
          task_name?: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_type?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_events: {
        Row: {
          assignee: string | null
          attendees: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          location: string | null
          memo: string | null
          priority: string | null
          progress: number | null
          project_id: string | null
          repeat_type: string | null
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          attendees?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          priority?: string | null
          progress?: number | null
          project_id?: string | null
          repeat_type?: string | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          attendees?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          priority?: string | null
          progress?: number | null
          project_id?: string | null
          repeat_type?: string | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_events_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "site_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_work_photos: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          memo: string | null
          photo_date: string
          photo_urls: string[] | null
          project_id: string | null
          purpose: string | null
          work_category: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          photo_date?: string
          photo_urls?: string[] | null
          project_id?: string | null
          purpose?: string | null
          work_category?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          memo?: string | null
          photo_date?: string
          photo_urls?: string[] | null
          project_id?: string | null
          purpose?: string | null
          work_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_work_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "site_work_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_workers: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          id: string
          is_active: boolean | null
          memo: string | null
          phone: string | null
          project_id: string | null
          trade: string | null
          updated_at: string | null
          worker_category: string | null
          worker_name: string
          worker_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          id?: string
          is_active?: boolean | null
          memo?: string | null
          phone?: string | null
          project_id?: string | null
          trade?: string | null
          updated_at?: string | null
          worker_category?: string | null
          worker_name: string
          worker_type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          id?: string
          is_active?: boolean | null
          memo?: string | null
          phone?: string | null
          project_id?: string | null
          trade?: string | null
          updated_at?: string | null
          worker_category?: string | null
          worker_name?: string
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "site_workers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontract_payments: {
        Row: {
          amount: number | null
          billing_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          paid_date: string | null
          project_id: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          amount?: number | null
          billing_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number | null
          billing_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      subcontract_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string | null
          unit_rate: number
          vendor_id: string | null
          vendor_name: string | null
          work_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
          unit_rate?: number
          vendor_id?: string | null
          vendor_name?: string | null
          work_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
          unit_rate?: number
          vendor_id?: string | null
          vendor_name?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontract_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontract_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_rates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tbm_records: {
        Row: {
          attendee_count: number | null
          attendee_ids: string[] | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          hazards: string[] | null
          id: string
          photo_urls: string[] | null
          project_id: string | null
          safety_checklist: string[] | null
          safety_measures: string | null
          safety_unchecked: string[] | null
          signatures: Json | null
          tbm_date: string
          tbm_time: string | null
          work_description: string | null
        }
        Insert: {
          attendee_count?: number | null
          attendee_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          hazards?: string[] | null
          id?: string
          photo_urls?: string[] | null
          project_id?: string | null
          safety_checklist?: string[] | null
          safety_measures?: string | null
          safety_unchecked?: string[] | null
          signatures?: Json | null
          tbm_date: string
          tbm_time?: string | null
          work_description?: string | null
        }
        Update: {
          attendee_count?: number | null
          attendee_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          hazards?: string[] | null
          id?: string
          photo_urls?: string[] | null
          project_id?: string | null
          safety_checklist?: string[] | null
          safety_measures?: string | null
          safety_unchecked?: string[] | null
          signatures?: Json | null
          tbm_date?: string
          tbm_time?: string | null
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tbm_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tbm_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          from_location: string | null
          id: string
          item_name: string
          qty: number | null
          reason: string | null
          reject_reason: string | null
          requested_by: string | null
          status: string | null
          to_location: string | null
          unit: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_location?: string | null
          id?: string
          item_name: string
          qty?: number | null
          reason?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          status?: string | null
          to_location?: string | null
          unit?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_location?: string | null
          id?: string
          item_name?: string
          qty?: number | null
          reason?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          status?: string | null
          to_location?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          face_descriptor: string | null
          face_photo_url: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          probation_end_date: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          face_descriptor?: string | null
          face_photo_url?: string | null
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          probation_end_date?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          face_descriptor?: string | null
          face_photo_url?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          probation_end_date?: string | null
          role?: string
        }
        Relationships: []
      }
      vehicle_costs: {
        Row: {
          amount: number | null
          cost_type: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          notes: string | null
          project_id: string | null
          receipt_url: string | null
          vehicle_id: string | null
        }
        Insert: {
          amount?: number | null
          cost_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          vehicle_id?: string | null
        }
        Update: {
          amount?: number | null
          cost_type?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          created_at: string | null
          id: string
          inspection_expiry: string | null
          insurance_expiry: string | null
          notes: string | null
          plate_no: string
          status: string | null
          vehicle_type: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          created_at?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          notes?: string | null
          plate_no: string
          status?: string | null
          vehicle_type?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          created_at?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          notes?: string | null
          plate_no?: string
          status?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      vendor_evaluations: {
        Row: {
          cooperation: number | null
          created_at: string | null
          delivery: number | null
          evaluator_id: string | null
          id: string
          price: number | null
          project_id: string | null
          quality: number | null
          safety: number | null
          vendor_id: string | null
        }
        Insert: {
          cooperation?: number | null
          created_at?: string | null
          delivery?: number | null
          evaluator_id?: string | null
          id?: string
          price?: number | null
          project_id?: string | null
          quality?: number | null
          safety?: number | null
          vendor_id?: string | null
        }
        Update: {
          cooperation?: number | null
          created_at?: string | null
          delivery?: number | null
          evaluator_id?: string | null
          id?: string
          price?: number | null
          project_id?: string | null
          quality?: number | null
          safety?: number | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          rating: number | null
          representative: string | null
          vendor_type: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          rating?: number | null
          representative?: string | null
          vendor_type?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          rating?: number | null
          representative?: string | null
          vendor_type?: string | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          caution: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          location: string | null
          project_id: string | null
          qty: string | null
          status: string | null
          updated_at: string | null
          work_type: string | null
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          caution?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          qty?: string | null
          status?: string | null
          updated_at?: string | null
          work_type?: string | null
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          caution?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          qty?: string | null
          status?: string | null
          updated_at?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_qualifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          expiry_date: string | null
          id: string
          project_id: string | null
          qualification_type: string
          worker_id: string | null
          worker_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          project_id?: string | null
          qualification_type: string
          worker_id?: string | null
          worker_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          project_id?: string | null
          qualification_type?: string
          worker_id?: string | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "worker_qualifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          emergency_contact: string | null
          id: string
          id_number: string | null
          is_active: boolean | null
          memo: string | null
          phone: string | null
          photo_url: string | null
          trade: string | null
          updated_at: string | null
          worker_name: string
          worker_type: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          emergency_contact?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          memo?: string | null
          phone?: string | null
          photo_url?: string | null
          trade?: string | null
          updated_at?: string | null
          worker_name: string
          worker_type?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          emergency_contact?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          memo?: string | null
          phone?: string | null
          photo_url?: string | null
          trade?: string | null
          updated_at?: string | null
          worker_name?: string
          worker_type?: string | null
        }
        Relationships: []
      }
      workforce_photos: {
        Row: {
          checked_worker_ids: string[] | null
          created_at: string | null
          created_by: string | null
          headcount: number | null
          id: string
          memo: string | null
          photo_date: string
          photo_url: string | null
          photo_urls: string[] | null
          project_id: string | null
          slot: string
          time_am_in: string | null
          time_am_out: string | null
          time_ot_in: string | null
          time_ot_out: string | null
          time_pm_in: string | null
          time_pm_out: string | null
        }
        Insert: {
          checked_worker_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          headcount?: number | null
          id?: string
          memo?: string | null
          photo_date?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          slot: string
          time_am_in?: string | null
          time_am_out?: string | null
          time_ot_in?: string | null
          time_ot_out?: string | null
          time_pm_in?: string | null
          time_pm_out?: string | null
        }
        Update: {
          checked_worker_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          headcount?: number | null
          id?: string
          memo?: string | null
          photo_date?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          project_id?: string | null
          slot?: string
          time_am_in?: string | null
          time_am_out?: string | null
          time_ot_in?: string | null
          time_ot_out?: string | null
          time_pm_in?: string | null
          time_pm_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workforce_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "workforce_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_billing_summary: {
        Row: {
          billing_count: number | null
          outstanding: number | null
          project_id: string | null
          total_claimed: number | null
          total_received: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_monthly_attendance_summary: {
        Row: {
          month: string | null
          night_days: number | null
          project_id: string | null
          total_hours: number | null
          total_overtime: number | null
          user_id: string | null
          weekend_days: number | null
          work_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "employee_attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_monthly_expense_summary: {
        Row: {
          category: string | null
          count: number | null
          month: string | null
          project_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      prepayment_balance: {
        Row: {
          balance: number | null
          project_id: string | null
          total_prepayment: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prepayments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prepayments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_rate: {
        Row: {
          actual_qty: number | null
          contract_qty: number | null
          progress_rate: number | null
          project_id: string | null
          remain_qty: number | null
          unit: string | null
          work_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_quantities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_quantities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_summary: {
        Row: {
          code: string | null
          contract_amount: number | null
          end_date: string | null
          gross_profit: number | null
          name: string | null
          project_id: string | null
          status: string | null
          total_cost: number | null
        }
        Relationships: []
      }
      v_billing_status: {
        Row: {
          approved_amount: number | null
          created_at: string | null
          created_by: string | null
          id: string | null
          note: string | null
          paid_amount: number | null
          period: string | null
          project_id: string | null
          request_amount: number | null
          round: number | null
          stages: Json | null
        }
        Insert: {
          approved_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          note?: string | null
          paid_amount?: number | null
          period?: string | null
          project_id?: string | null
          request_amount?: number | null
          round?: number | null
          stages?: Json | null
        }
        Update: {
          approved_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          note?: string | null
          paid_amount?: number | null
          period?: string | null
          project_id?: string | null
          request_amount?: number | null
          round?: number | null
          stages?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billing_status_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_billings: {
        Row: {
          billing_date: string | null
          billing_no: string | null
          claim_amount: number | null
          created_at: string | null
          expected_payment_date: string | null
          id: string | null
          note: string | null
          period_from: string | null
          period_to: string | null
          project_id: string | null
          received_amount: number | null
          received_date: string | null
          status: string | null
        }
        Insert: {
          billing_date?: string | null
          billing_no?: string | null
          claim_amount?: number | null
          created_at?: string | null
          expected_payment_date?: string | null
          id?: string | null
          note?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id?: string | null
          received_amount?: number | null
          received_date?: string | null
          status?: string | null
        }
        Update: {
          billing_date?: string | null
          billing_no?: string | null
          claim_amount?: number | null
          created_at?: string | null
          expected_payment_date?: string | null
          id?: string | null
          note?: string | null
          period_from?: string | null
          period_to?: string | null
          project_id?: string | null
          received_amount?: number | null
          received_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cost_budgets: {
        Row: {
          etc_budget: number | null
          id: string | null
          indirect_rate: number | null
          labor_budget: number | null
          mat_budget: number | null
          project_id: string | null
          total_budget: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          etc_budget?: number | null
          id?: string | null
          indirect_rate?: number | null
          labor_budget?: number | null
          mat_budget?: number | null
          project_id?: string | null
          total_budget?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          etc_budget?: number | null
          id?: string | null
          indirect_rate?: number | null
          labor_budget?: number | null
          mat_budget?: number | null
          project_id?: string | null
          total_budget?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_costs: {
        Row: {
          amount: number | null
          cost_date: string | null
          cost_type: string | null
          created_at: string | null
          id: string | null
          item_name: string | null
          note: string | null
          paid_status: string | null
          project_id: string | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          cost_date?: string | null
          cost_type?: string | null
          created_at?: string | null
          id?: string | null
          item_name?: string | null
          note?: string | null
          paid_status?: string | null
          project_id?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          cost_date?: string | null
          cost_type?: string | null
          created_at?: string | null
          id?: string | null
          item_name?: string | null
          note?: string | null
          paid_status?: string | null
          project_id?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_labor_cost: {
        Row: {
          id: string | null
          project_id: string | null
          report_date: string | null
          total_labor_cost: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string | null
          project_id?: string | null
          report_date?: string | null
          total_labor_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          project_id?: string | null
          report_date?: string | null
          total_labor_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_labor_cost_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_labor_cost_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_prepayments: {
        Row: {
          amount: number | null
          created_at: string | null
          deducted: number | null
          description: string | null
          id: string | null
          note: string | null
          project_id: string | null
          recv_date: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          deducted?: number | null
          description?: string | null
          id?: string | null
          note?: string | null
          project_id?: string | null
          recv_date?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          deducted?: number | null
          description?: string | null
          id?: string | null
          note?: string | null
          project_id?: string | null
          recv_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prepayments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prepayments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_price_history: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          item_name: string | null
          notes: string | null
          project_id: string | null
          purchase_date: string | null
          qty: number | null
          quantity: number | null
          source: string | null
          unit: string | null
          unit_price: number | null
          vendor: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          item_name?: string | null
          notes?: string | null
          project_id?: string | null
          purchase_date?: string | null
          qty?: number | null
          quantity?: number | null
          source?: string | null
          unit?: string | null
          unit_price?: number | null
          vendor?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          item_name?: string | null
          notes?: string | null
          project_id?: string | null
          purchase_date?: string | null
          qty?: number | null
          quantity?: number | null
          source?: string | null
          unit?: string | null
          unit_price?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "price_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recurring_expenses: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          cycle: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          next_run: string | null
          project_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          next_run?: string | null
          project_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          cycle?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          next_run?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "recurring_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_salary_monthly: {
        Row: {
          allowances: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          exception_deduction: number | null
          id: string | null
          insurance_deduction: number | null
          meal_total: number | null
          month: string | null
          net_total: number | null
          ot_hours: number | null
          ot_pay: number | null
          other_bonus: number | null
          other_deduction: number | null
          probation_days: number | null
          probation_pay: number | null
          regular_days: number | null
          regular_pay: number | null
          tax: number | null
          user_id: string | null
        }
        Insert: {
          allowances?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          exception_deduction?: number | null
          id?: string | null
          insurance_deduction?: number | null
          meal_total?: number | null
          month?: string | null
          net_total?: number | null
          ot_hours?: number | null
          ot_pay?: number | null
          other_bonus?: number | null
          other_deduction?: number | null
          probation_days?: number | null
          probation_pay?: number | null
          regular_days?: number | null
          regular_pay?: number | null
          tax?: number | null
          user_id?: string | null
        }
        Update: {
          allowances?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          exception_deduction?: number | null
          id?: string | null
          insurance_deduction?: number | null
          meal_total?: number | null
          month?: string | null
          net_total?: number | null
          ot_hours?: number | null
          ot_pay?: number | null
          other_bonus?: number | null
          other_deduction?: number | null
          probation_days?: number | null
          probation_pay?: number | null
          regular_days?: number | null
          regular_pay?: number | null
          tax?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_salary_settings: {
        Row: {
          base_amount: number | null
          bhtn_rate: number | null
          bhxh_rate: number | null
          bhyt_rate: number | null
          created_at: string | null
          female_allowance: number | null
          id: string | null
          insurance_base_amount: number | null
          meal_allowance: number | null
          overtime_rate: number | null
          probation_rate: number | null
          probation_salary: number | null
          responsibility_allowance: number | null
          salary_type: string | null
          site_allowance: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_amount?: number | null
          bhtn_rate?: number | null
          bhxh_rate?: number | null
          bhyt_rate?: number | null
          created_at?: string | null
          female_allowance?: number | null
          id?: string | null
          insurance_base_amount?: number | null
          meal_allowance?: number | null
          overtime_rate?: number | null
          probation_rate?: number | null
          probation_salary?: number | null
          responsibility_allowance?: number | null
          salary_type?: string | null
          site_allowance?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_amount?: number | null
          bhtn_rate?: number | null
          bhxh_rate?: number | null
          bhyt_rate?: number | null
          created_at?: string | null
          female_allowance?: number | null
          id?: string | null
          insurance_base_amount?: number | null
          meal_allowance?: number | null
          overtime_rate?: number | null
          probation_rate?: number | null
          probation_salary?: number | null
          responsibility_allowance?: number | null
          salary_type?: string | null
          site_allowance?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_subcontract_payments: {
        Row: {
          amount: number | null
          billing_id: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          paid_date: string | null
          project_id: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          amount?: number | null
          billing_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number | null
          billing_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_leave: { Args: { p_leave_id: string }; Returns: Json }
      calc_monthly_salary: {
        Args: { p_month: string; p_project_id: string }
        Returns: {
          base_pay: number
          emp_id: string
          emp_name: string
          exc_deduct: number
          gross_pay: number
          ins_deduct: number
          meal_allow: number
          net_pay: number
          night_days: number
          ot_hours: number
          ot_pay: number
          probation_days: number
          regular_days: number
          weekend_days: number
          work_days: number
        }[]
      }
      complete_advance_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      fn_check_expiry_alerts: { Args: never; Returns: undefined }
      get_actual_qty: {
        Args: {
          p_qty_db2015: number
          p_qty_hlm: number
          p_qty_m230: number
          p_qty_other: number
          p_qty_sv250: number
          p_qty_v250: number
          p_work_type: string
        }
        Returns: number
      }
      get_labor_rate: {
        Args: { p_date: string; p_pid: string; p_type: string }
        Returns: number
      }
      get_my_role: { Args: never; Returns: string }
      get_ot_rate: {
        Args: { p_date: string; p_pid: string; p_type: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_finance: { Args: never; Returns: boolean }
      is_finance_admin: { Args: never; Returns: boolean }
      is_hr: { Args: never; Returns: boolean }
      is_office: { Args: never; Returns: boolean }
      is_top: { Args: never; Returns: boolean }
      refresh_all_mv: { Args: never; Returns: undefined }
      reject_leave: {
        Args: { p_leave_id: string; p_reason: string }
        Returns: Json
      }
      reset_user_password: {
        Args: { new_password: string; target_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
