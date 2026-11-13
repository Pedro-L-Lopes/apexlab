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
      admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          parent_id: string | null
          position: number
          show_on_home: boolean
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          show_on_home?: boolean
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          show_on_home?: boolean
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          id: string
          product_id: string | null
          source_url: string
          status: Database["public"]["Enums"]["import_job_status"]
          stl_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          product_id?: string | null
          source_url: string
          status?: Database["public"]["Enums"]["import_job_status"]
          stl_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          product_id?: string | null
          source_url?: string
          status?: Database["public"]["Enums"]["import_job_status"]
          stl_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_listing"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          is_cover: boolean
          position: number
          product_id: string
          url: string
        }
        Insert: {
          id?: string
          is_cover?: boolean
          position?: number
          product_id: string
          url: string
        }
        Update: {
          id?: string
          is_cover?: boolean
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_listing"
            referencedColumns: ["id"]
          },
        ]
      }
      product_private: {
        Row: {
          cost: number | null
          license: string | null
          notes: string | null
          product_id: string
          source_url: string | null
          stl_url: string | null
        }
        Insert: {
          cost?: number | null
          license?: string | null
          notes?: string | null
          product_id: string
          source_url?: string | null
          stl_url?: string | null
        }
        Update: {
          cost?: number | null
          license?: string | null
          notes?: string | null
          product_id?: string
          source_url?: string | null
          stl_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_private_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_private_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_listing"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          attributes: Json
          depth_mm: number | null
          height_mm: number | null
          id: string
          name: string
          position: number
          price: number | null
          product_id: string
          weight_g: number | null
          width_mm: number | null
        }
        Insert: {
          active?: boolean
          attributes?: Json
          depth_mm?: number | null
          height_mm?: number | null
          id?: string
          name: string
          position?: number
          price?: number | null
          product_id: string
          weight_g?: number | null
          width_mm?: number | null
        }
        Update: {
          active?: boolean
          attributes?: Json
          depth_mm?: number | null
          height_mm?: number | null
          id?: string
          name?: string
          position?: number
          price?: number | null
          product_id?: string
          weight_g?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_listing"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          colors: string[]
          created_at: string
          depth_mm: number | null
          description: string | null
          featured: boolean
          height_mm: number | null
          id: string
          material: string | null
          name: string
          position: number
          price: number | null
          print_time_min: number | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          tags: string[]
          updated_at: string
          weight_g: number | null
          width_mm: number | null
        }
        Insert: {
          category_id?: string | null
          colors?: string[]
          created_at?: string
          depth_mm?: number | null
          description?: string | null
          featured?: boolean
          height_mm?: number | null
          id?: string
          material?: string | null
          name: string
          position?: number
          price?: number | null
          print_time_min?: number | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          updated_at?: string
          weight_g?: number | null
          width_mm?: number | null
        }
        Update: {
          category_id?: string | null
          colors?: string[]
          created_at?: string
          depth_mm?: number | null
          description?: string | null
          featured?: boolean
          height_mm?: number | null
          id?: string
          material?: string | null
          name?: string
          position?: number
          price?: number | null
          print_time_min?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          updated_at?: string
          weight_g?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          banner_url: string | null
          description: string
          id: number
          instagram: string | null
          logo_url: string | null
          name: string
          primary_color: string
          updated_at: string
          whatsapp: string
          whatsapp_message_template: string
        }
        Insert: {
          banner_url?: string | null
          description?: string
          id?: number
          instagram?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string
          updated_at?: string
          whatsapp?: string
          whatsapp_message_template?: string
        }
        Update: {
          banner_url?: string | null
          description?: string
          id?: number
          instagram?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string
          updated_at?: string
          whatsapp?: string
          whatsapp_message_template?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_listing: {
        Row: {
          active_variants_count: number | null
          category_id: string | null
          colors: string[] | null
          cover_image_url: string | null
          created_at: string | null
          depth_mm: number | null
          description: string | null
          featured: boolean | null
          height_mm: number | null
          id: string | null
          material: string | null
          name: string | null
          position: number | null
          price: number | null
          print_time_min: number | null
          slug: string | null
          starting_price: number | null
          tags: string[] | null
          updated_at: string | null
          weight_g: number | null
          width_mm: number | null
        }
        Insert: {
          active_variants_count?: never
          category_id?: string | null
          colors?: string[] | null
          cover_image_url?: never
          created_at?: string | null
          depth_mm?: number | null
          description?: string | null
          featured?: boolean | null
          height_mm?: number | null
          id?: string | null
          material?: string | null
          name?: string | null
          position?: number | null
          price?: number | null
          print_time_min?: number | null
          slug?: string | null
          starting_price?: never
          tags?: string[] | null
          updated_at?: string | null
          weight_g?: number | null
          width_mm?: number | null
        }
        Update: {
          active_variants_count?: never
          category_id?: string | null
          colors?: string[] | null
          cover_image_url?: never
          created_at?: string | null
          depth_mm?: number | null
          description?: string | null
          featured?: boolean | null
          height_mm?: number | null
          id?: string | null
          material?: string | null
          name?: string | null
          position?: number | null
          price?: number | null
          print_time_min?: number | null
          slug?: string | null
          starting_price?: never
          tags?: string[] | null
          updated_at?: string | null
          weight_g?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      import_job_status: "pending" | "processing" | "done" | "error"
      product_status: "draft" | "active" | "hidden"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      import_job_status: ["pending", "processing", "done", "error"],
      product_status: ["draft", "active", "hidden"],
    },
  },
} as const
