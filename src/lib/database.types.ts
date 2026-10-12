export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      activity_events: {
        Row: {
          actor_id: string
          counterpart_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: number
          module: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          actor_id: string
          counterpart_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: never
          module: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          actor_id?: string
          counterpart_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: never
          module?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_counterpart_id_fkey"
            columns: ["counterpart_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      garage_items: {
        Row: {
          category_id: string
          comes_with: string | null
          condition: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          location: string | null
          name: string
          notes: string | null
          paused_until: string | null
          photo_path: string | null
          replacement_cost_cents: number
          status: string
        }
        Insert: {
          category_id: string
          comes_with?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string
          household_id: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          paused_until?: string | null
          photo_path?: string | null
          replacement_cost_cents: number
          status?: string
        }
        Update: {
          category_id?: string
          comes_with?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          paused_until?: string | null
          photo_path?: string | null
          replacement_cost_cents?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "garage_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_loans: {
        Row: {
          borrower_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          due_on: string | null
          ended_at: string | null
          ended_by: string | null
          id: string
          item_id: string
          previous_loan_id: string | null
          request_id: string | null
          return_photo_path: string | null
          start_photo_path: string | null
          started_at: string
          started_by: string
        }
        Insert: {
          borrower_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          due_on?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          item_id: string
          previous_loan_id?: string | null
          request_id?: string | null
          return_photo_path?: string | null
          start_photo_path?: string | null
          started_at?: string
          started_by: string
        }
        Update: {
          borrower_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          due_on?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          item_id?: string
          previous_loan_id?: string | null
          request_id?: string | null
          return_photo_path?: string | null
          start_photo_path?: string | null
          started_at?: string
          started_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_loans_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_loans_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_loans_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "garage_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_loans_previous_loan_id_fkey"
            columns: ["previous_loan_id"]
            isOneToOne: false
            referencedRelation: "garage_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_loans_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "garage_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_loans_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          due_on: string | null
          id: string
          item_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_on?: string | null
          id?: string
          item_id: string
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_on?: string | null
          id?: string
          item_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "garage_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garage_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          household_id: string
          id: string
          profile_id: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          household_id: string
          id?: string
          profile_id?: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          household_id?: string
          id?: string
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_join_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_join_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          inviter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          inviter_id?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          inviter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          about_profile_id: string | null
          created_at: string
          description: string
          id: string
          kind: string
          module: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          about_profile_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind: string
          module?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          about_profile_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: string
          module?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_about_profile_id_fkey"
            columns: ["about_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          display_name: string
          email: string
          household_id: string | null
          id: string
          invited_by: string | null
          joined_at: string
          languages: string[]
          phone: string | null
          preferred_contact: string | null
          role: string
          status: string
        }
        Insert: {
          bio?: string | null
          display_name?: string
          email: string
          household_id?: string | null
          id: string
          invited_by?: string | null
          joined_at?: string
          languages?: string[]
          phone?: string | null
          preferred_contact?: string | null
          role?: string
          status?: string
        }
        Update: {
          bio?: string | null
          display_name?: string
          email?: string
          household_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          languages?: string[]
          phone?: string | null
          preferred_contact?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_upload_garage_photo: { Args: { p_name: string }; Returns: boolean }
      create_household: {
        Args: { p_address?: string; p_name: string }
        Returns: string
      }
      garage_close_request: { Args: { p_request: string }; Returns: undefined }
      garage_confirm_return: { Args: { p_loan: string }; Returns: undefined }
      garage_hand_off: {
        Args: { p_loan: string; p_photo?: string; p_request: string }
        Returns: string
      }
      garage_hand_over: {
        Args: { p_photo?: string; p_request: string }
        Returns: string
      }
      garage_item_household: { Args: { p_item: string }; Returns: string }
      garage_next_in_line: {
        Args: { p_item: string }
        Returns: {
          display_name: string
          request_id: string
          requester_id: string
        }[]
      }
      garage_queue: {
        Args: { p_item: string }
        Returns: {
          my_position: number
          waiting: number
        }[]
      }
      garage_request: {
        Args: { p_due_on?: string; p_item: string }
        Returns: string
      }
      garage_return: {
        Args: { p_loan: string; p_photo?: string }
        Returns: string
      }
      is_active_member: { Args: never; Returns: boolean }
      is_my_item: { Args: { p_item: string }; Returns: boolean }
      is_steward: { Args: never; Returns: boolean }
      log_event: {
        Args: {
          p_actor: string
          p_counterpart?: string
          p_details?: Json
          p_module: string
          p_subject_id: string
          p_subject_type: string
          p_type: string
        }
        Returns: undefined
      }
      my_household_id: { Args: never; Returns: string }
      my_stats: {
        Args: never
        Returns: {
          event_type: string
          module: string
          n: number
        }[]
      }
      profile_facts: {
        Args: { p_profile: string }
        Returns: {
          things_lent: number
          times_borrowed: number
        }[]
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

