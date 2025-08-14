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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          created_at: string
          created_by: string
          failed_count: number | null
          id: string
          message: string
          recipients_count: number | null
          send_via_email: boolean | null
          send_via_whatsapp: boolean | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          failed_count?: number | null
          id?: string
          message: string
          recipients_count?: number | null
          send_via_email?: boolean | null
          send_via_whatsapp?: boolean | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          failed_count?: number | null
          id?: string
          message?: string
          recipients_count?: number | null
          send_via_email?: boolean | null
          send_via_whatsapp?: boolean | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      announcement_deliveries: {
        Row: {
          announcement_id: string
          delivery_method: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          delivery_method: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          delivery_method?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_deliveries_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "admin_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          analisado_em: string | null
          contexto: string | null
          conversa: Json | null
          criado_em: string | null
          grupo: string | null
          id: string
          id_usuario: string
          modificado_em: string | null
          nome: string | null
          prioridade: string | null
          remote_jid: string
        }
        Insert: {
          analisado_em?: string | null
          contexto?: string | null
          conversa?: Json | null
          criado_em?: string | null
          grupo?: string | null
          id?: string
          id_usuario: string
          modificado_em?: string | null
          nome?: string | null
          prioridade?: string | null
          remote_jid: string
        }
        Update: {
          analisado_em?: string | null
          contexto?: string | null
          conversa?: Json | null
          criado_em?: string | null
          grupo?: string | null
          id?: string
          id_usuario?: string
          modificado_em?: string | null
          nome?: string | null
          prioridade?: string | null
          remote_jid?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          description: string
          id: string
          rating: number | null
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          rating?: number | null
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          rating?: number | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          id: number
          name: string | null
          number: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          number?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          number?: string | null
        }
        Relationships: []
      }
      monitored_whatsapp_groups: {
        Row: {
          created_at: string
          group_id: string
          group_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          group_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          group_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apenas_horario_comercial: boolean | null
          avatar: string | null
          calendar_preferences: Json | null
          created_at: string | null
          default_calendar_id: string | null
          email: string | null
          google_calendar_connected: boolean | null
          google_calendar_refresh_token: string | null
          google_calendar_token: string | null
          id: string
          instance_name: string | null
          name: string | null
          nome: string
          numero: string | null
          onboarding_completed: boolean | null
          referral_code: string | null
          referred_by_user_id: string | null
          resume_audio: boolean | null
          role: string | null
          segundos_para_resumir: number | null
          send_on_reaction: boolean | null
          send_private_only: boolean | null
          "Summi em Audio?": boolean | null
          temas_importantes: string | null
          temas_urgentes: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          transcreve_audio_enviado: boolean | null
          transcreve_audio_recebido: boolean | null
          translate_audio: boolean | null
          translate_to: string | null
          updated_at: string | null
        }
        Insert: {
          apenas_horario_comercial?: boolean | null
          avatar?: string | null
          calendar_preferences?: Json | null
          created_at?: string | null
          default_calendar_id?: string | null
          email?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_refresh_token?: string | null
          google_calendar_token?: string | null
          id: string
          instance_name?: string | null
          name?: string | null
          nome: string
          numero?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          resume_audio?: boolean | null
          role?: string | null
          segundos_para_resumir?: number | null
          send_on_reaction?: boolean | null
          send_private_only?: boolean | null
          "Summi em Audio?"?: boolean | null
          temas_importantes?: string | null
          temas_urgentes?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          transcreve_audio_enviado?: boolean | null
          transcreve_audio_recebido?: boolean | null
          translate_audio?: boolean | null
          translate_to?: string | null
          updated_at?: string | null
        }
        Update: {
          apenas_horario_comercial?: boolean | null
          avatar?: string | null
          calendar_preferences?: Json | null
          created_at?: string | null
          default_calendar_id?: string | null
          email?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_refresh_token?: string | null
          google_calendar_token?: string | null
          id?: string
          instance_name?: string | null
          name?: string | null
          nome?: string
          numero?: string | null
          onboarding_completed?: boolean | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          resume_audio?: boolean | null
          role?: string | null
          segundos_para_resumir?: number | null
          send_on_reaction?: boolean | null
          send_private_only?: boolean | null
          "Summi em Audio?"?: boolean | null
          temas_importantes?: string | null
          temas_urgentes?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          transcreve_audio_enviado?: boolean | null
          transcreve_audio_recebido?: boolean | null
          translate_audio?: boolean | null
          translate_to?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          attempts: number
          id: string
          last_attempt: string
          operation_type: string
          reset_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          id?: string
          last_attempt?: string
          operation_type: string
          reset_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          id?: string
          last_attempt?: string
          operation_type?: string
          reset_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_start: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_calendars: {
        Row: {
          calendar_id: string
          calendar_name: string
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          is_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          calendar_name: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          calendar_name?: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_calendars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_groups_cache: {
        Row: {
          group_id: string
          group_name: string
          id: string
          last_updated: string
          participants_count: number | null
          user_id: string
        }
        Insert: {
          group_id: string
          group_name: string
          id?: string
          last_updated?: string
          participants_count?: number | null
          user_id: string
        }
        Update: {
          group_id?: string
          group_name?: string
          id?: string
          last_updated?: string
          participants_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _max_attempts?: number
          _operation_type: string
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_secure_instance_name: {
        Args: { user_nome: string; user_numero: string }
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      sync_profile_emails: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_brazilian_phone: {
        Args: { phone_number: string }
        Returns: boolean
      }
      verify_admin_access: {
        Args: { user_id: string }
        Returns: boolean
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
  public: {
    Enums: {},
  },
} as const
