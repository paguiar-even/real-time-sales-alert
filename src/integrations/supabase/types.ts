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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          tenant_id: string | null
          tenant_name: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications_log: {
        Row: {
          channels: string[] | null
          created_at: string | null
          id: string
          results: Json | null
          tenant_id: string | null
          tenant_name: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string | null
          id?: string
          results?: Json | null
          tenant_id?: string | null
          tenant_name: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string | null
          id?: string
          results?: Json | null
          tenant_id?: string | null
          tenant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          mfa_enabled: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          mfa_enabled?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          mfa_enabled?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      sales_status: {
        Row: {
          created_at: string
          id: number
          tenant_id: string | null
          vendas_minuto: number
          vendas_status: string
        }
        Insert: {
          created_at?: string
          id?: number
          tenant_id?: string | null
          vendas_minuto?: number
          vendas_status: string
        }
        Update: {
          created_at?: string
          id?: number
          tenant_id?: string | null
          vendas_minuto?: number
          vendas_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_access_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          tenant_id: string | null
          tenant_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          tenant_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          tenant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          email_domains: string[]
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          created_at?: string
          email_domains?: string[]
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          created_at?: string
          email_domains?: string[]
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          created_at: string
          id: string
          is_blocked: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_blocked?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_blocked?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          assign_admin?: boolean
          assign_staff?: boolean
          user_email: string
          user_full_name?: string
          user_password: string
          user_phone?: string
        }
        Returns: string
      }
      admin_reset_user_mfa: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      admin_reset_user_password: {
        Args: { new_password: string; target_user_id: string }
        Returns: boolean
      }
      admin_toggle_user_mfa: {
        Args: { mfa_required: boolean; target_user_id: string }
        Returns: boolean
      }
      assign_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      assign_staff_role: { Args: { target_user_id: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          mfa_enabled: boolean
          phone: string
          user_id: string
        }[]
      }
      get_hourly_sales_for_staff: {
        Args: { p_hours?: number; p_tenant_id: string; p_token: string }
        Returns: {
          had_zero_sales: boolean
          hour: string
          total_sales: number
        }[]
      }
      get_sales_status_for_staff: {
        Args: { p_limit?: number; p_tenant_id: string; p_token: string }
        Returns: {
          created_at: string
          id: number
          tenant_id: string
          vendas_minuto: number
          vendas_status: string
        }[]
      }
      get_staff_tokens: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_used_at: string
          name: string
          token: string
          user_email: string
          user_id: string
        }[]
      }
      get_staff_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          has_active_token: boolean
          mfa_enabled: boolean
          phone: string
          user_id: string
        }[]
      }
      get_tenant_access_logs: {
        Args: { limit_count?: number; target_tenant_id: string }
        Returns: {
          action: string
          created_at: string
          id: string
          ip_address: string
          user_agent: string
          user_email: string
          user_id: string
        }[]
      }
      get_tenant_info_for_user: {
        Args: { p_tenant_id: string }
        Returns: {
          email_domains: string[]
          id: string
          is_active: boolean
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_tenant_users: {
        Args: { target_tenant_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_blocked: boolean
          mfa_enabled: boolean
          phone: string
          user_id: string
          user_tenant_id: string
        }[]
      }
      get_tenant_webhook_token: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_tenants_for_staff: {
        Args: { p_token: string }
        Returns: {
          id: string
          is_active: boolean
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_user_email: { Args: { user_uuid: string }; Returns: string }
      get_user_tenant_id: { Args: { user_uuid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { user_uuid: string }; Returns: boolean }
      log_user_access: {
        Args: { p_action?: string; p_tenant_id: string; p_tenant_name: string }
        Returns: string
      }
      remove_admin_role: { Args: { target_user_id: string }; Returns: boolean }
      remove_staff_role: { Args: { target_user_id: string }; Returns: boolean }
      search_users_by_email: {
        Args: { search_email: string }
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      validate_staff_token: {
        Args: { p_tenant_slug: string; p_token: string }
        Returns: {
          is_valid: boolean
          tenant_id: string
          tenant_logo_url: string
          tenant_name: string
          user_email: string
        }[]
      }
      validate_staff_token_only: {
        Args: { p_token: string }
        Returns: {
          is_valid: boolean
          token_name: string
          user_email: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
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
  public: {
    Enums: {
      app_role: ["admin", "user", "staff"],
    },
  },
} as const
