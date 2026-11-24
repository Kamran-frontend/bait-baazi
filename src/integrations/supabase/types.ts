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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      books: {
        Row: {
          created_at: string
          id: string
          page_count: number | null
          poet_id: string | null
          source_pdf: string | null
          title_english: string | null
          title_urdu: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_count?: number | null
          poet_id?: string | null
          source_pdf?: string | null
          title_english?: string | null
          title_urdu: string
        }
        Update: {
          created_at?: string
          id?: string
          page_count?: number | null
          poet_id?: string | null
          source_pdf?: string | null
          title_english?: string | null
          title_urdu?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_poet_id_fkey"
            columns: ["poet_id"]
            isOneToOne: false
            referencedRelation: "poets"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          shair_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shair_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shair_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_shair_id_fkey"
            columns: ["shair_id"]
            isOneToOne: false
            referencedRelation: "shair"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pdf_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_count: number | null
          filename: string
          id: string
          status: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_count?: number | null
          filename: string
          id?: string
          status?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_count?: number | null
          filename?: string
          id?: string
          status?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      poets: {
        Row: {
          bio: string | null
          created_at: string
          era: string | null
          id: string
          name_english: string | null
          name_urdu: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          era?: string | null
          id?: string
          name_english?: string | null
          name_urdu: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          era?: string | null
          id?: string
          name_english?: string | null
          name_urdu?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      shair: {
        Row: {
          approved: boolean
          book_id: string | null
          category: string | null
          created_at: string
          difficulty: number | null
          end_letter: string
          id: string
          is_attack: boolean | null
          keywords: string[] | null
          page_number: number | null
          poet_id: string | null
          popularity: number | null
          search_vector: unknown
          serial: number
          source: string | null
          start_letter: string
          tags: string[] | null
          text_urdu: string
        }
        Insert: {
          approved?: boolean
          book_id?: string | null
          category?: string | null
          created_at?: string
          difficulty?: number | null
          end_letter: string
          id?: string
          is_attack?: boolean | null
          keywords?: string[] | null
          page_number?: number | null
          poet_id?: string | null
          popularity?: number | null
          search_vector?: unknown
          serial?: number
          source?: string | null
          start_letter: string
          tags?: string[] | null
          text_urdu: string
        }
        Update: {
          approved?: boolean
          book_id?: string | null
          category?: string | null
          created_at?: string
          difficulty?: number | null
          end_letter?: string
          id?: string
          is_attack?: boolean | null
          keywords?: string[] | null
          page_number?: number | null
          poet_id?: string | null
          popularity?: number | null
          search_vector?: unknown
          serial?: number
          source?: string | null
          start_letter?: string
          tags?: string[] | null
          text_urdu?: string
        }
        Relationships: [
          {
            foreignKeyName: "shair_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shair_poet_id_fkey"
            columns: ["poet_id"]
            isOneToOne: false
            referencedRelation: "poets"
            referencedColumns: ["id"]
          },
        ]
      }
      shair_flags: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          shair_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          shair_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          shair_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shair_flags_shair_id_fkey"
            columns: ["shair_id"]
            isOneToOne: false
            referencedRelation: "shair"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
