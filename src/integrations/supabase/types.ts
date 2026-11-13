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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bodyweights: {
        Row: {
          entry_date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          entry_date?: string
          id?: string
          user_id?: string
          weight: number
        }
        Update: {
          entry_date?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          name_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_key: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_key?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_versions: {
        Row: {
          id: string
          saved_at: string
          snapshot: Json
          user_id: string
          version: number
        }
        Insert: {
          id?: string
          saved_at?: string
          snapshot: Json
          user_id?: string
          version: number
        }
        Update: {
          id?: string
          saved_at?: string
          snapshot?: Json
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      plans: {
        Row: {
          days: Json
          days_per_week: number
          updated_at: string
          user_id: string
          version: number
          weekdays: number[]
        }
        Insert: {
          days?: Json
          days_per_week?: number
          updated_at?: string
          user_id?: string
          version?: number
          weekdays?: number[]
        }
        Update: {
          days?: Json
          days_per_week?: number
          updated_at?: string
          user_id?: string
          version?: number
          weekdays?: number[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          day_snapshot: Json
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          plan_version: number | null
          session_date: string
          started_at: string
          status: string
          user_id: string
          workout_day_id: string | null
          workout_name: string
        }
        Insert: {
          day_snapshot?: Json
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          plan_version?: number | null
          session_date?: string
          started_at?: string
          status?: string
          user_id?: string
          workout_day_id?: string | null
          workout_name: string
        }
        Update: {
          day_snapshot?: Json
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          plan_version?: number | null
          session_date?: string
          started_at?: string
          status?: string
          user_id?: string
          workout_day_id?: string | null
          workout_name?: string
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          completed: boolean
          exercise_id: string | null
          exercise_name: string
          exercise_notes: string | null
          id: string
          reps: number | null
          session_id: string
          set_number: number
          user_id: string
          weight: number | null
        }
        Insert: {
          completed?: boolean
          exercise_id?: string | null
          exercise_name: string
          exercise_notes?: string | null
          id?: string
          reps?: number | null
          session_id: string
          set_number: number
          user_id?: string
          weight?: number | null
        }
        Update: {
          completed?: boolean
          exercise_id?: string | null
          exercise_name?: string
          exercise_notes?: string | null
          id?: string
          reps?: number | null
          session_id?: string
          set_number?: number
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
