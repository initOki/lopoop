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
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      custom_menus: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'group' | 'personal' | 'dashboard' | 'external_link' | 'custom_page' | 'project'
          config: Json
          menu_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'group' | 'personal' | 'dashboard' | 'external_link' | 'custom_page' | 'project'
          config?: Json
          menu_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'group' | 'personal' | 'dashboard' | 'external_link' | 'custom_page' | 'project'
          config?: Json
          menu_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_menus_menu_members_fkey"
            columns: ["id"]
            isOneToMany: true
            referencedRelation: "menu_members"
            referencedColumns: ["menu_id"]
          }
        ]
      }
      archived_menus: {
        Row: {
          id: string
          original_menu_id: string
          user_id: string
          name: string
          type: string
          config: Json
          menu_order: number
          original_created_at: string
          original_updated_at: string
          deleted_at: string | null
          recovery_expires_at: string | null
          deleted_by: string
        }
        Insert: {
          id?: string
          original_menu_id: string
          user_id: string
          name: string
          type: string
          config?: Json
          menu_order?: number
          original_created_at: string
          original_updated_at: string
          deleted_at?: string | null
          recovery_expires_at?: string | null
          deleted_by: string
        }
        Update: {
          id?: string
          original_menu_id?: string
          user_id?: string
          name?: string
          type?: string
          config?: Json
          menu_order?: number
          original_created_at?: string
          original_updated_at?: string
          deleted_at?: string | null
          recovery_expires_at?: string | null
          deleted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "archived_menu_members_archived_menu_id_fkey"
            columns: ["id"]
            isOneToMany: true
            referencedRelation: "archived_menu_members"
            referencedColumns: ["archived_menu_id"]
          }
        ]
      }
      archived_menu_members: {
        Row: {
          id: string
          archived_menu_id: string
          original_member_id: string
          menu_id: string
          user_id: string
          role: string
          joined_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          archived_menu_id: string
          original_member_id: string
          menu_id: string
          user_id: string
          role: string
          joined_at: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          archived_menu_id?: string
          original_member_id?: string
          menu_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          archived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_menu_members_archived_menu_id_fkey"
            columns: ["archived_menu_id"]
            isOneToMany: false
            referencedRelation: "archived_menus"
            referencedColumns: ["id"]
          }
        ]
      }
      debts: {
        Row: {
          amount: number | null
          created_at: string | null
          creditor: string
          debtor: string
          description: string | null
          id: string
          is_paid: boolean | null
          item: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          creditor: string
          debtor: string
          description?: string | null
          id?: string
          is_paid?: boolean | null
          item?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          creditor?: string
          debtor?: string
          description?: string | null
          id?: string
          is_paid?: boolean | null
          item?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_members: {
        Row: {
          id: string
          menu_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          menu_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          menu_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_members_menu_id_fkey"
            columns: ["menu_id"]
            isOneToMany: false
            referencedRelation: "custom_menus"
            referencedColumns: ["id"]
          }
        ]
      }
      personal_debts: {
        Row: {
          id: string
          user_id: string
          debtor: string
          creditor: string
          amount: number | null
          item: string | null
          description: string | null
          is_paid: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          debtor: string
          creditor: string
          amount?: number | null
          item?: string | null
          description?: string | null
          is_paid?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          debtor?: string
          creditor?: string
          amount?: number | null
          item?: string | null
          description?: string | null
          is_paid?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_schedules: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          type: 'raid' | 'meeting' | 'event' | 'personal'
          participants: string[]
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          type?: 'raid' | 'meeting' | 'event' | 'personal'
          participants?: string[]
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          type?: 'raid' | 'meeting' | 'event' | 'personal'
          participants?: string[]
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          id: number
          is_completed: boolean | null
          raid_name: string | null
          slot_1: string | null
          slot_1_combat_power: number | null
          slot_2: string | null
          slot_2_combat_power: number | null
          slot_3: string | null
          slot_3_combat_power: number | null
          slot_4: string | null
          slot_4_combat_power: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_completed?: boolean | null
          raid_name?: string | null
          slot_1?: string | null
          slot_1_combat_power?: number | null
          slot_2?: string | null
          slot_2_combat_power?: number | null
          slot_3?: string | null
          slot_3_combat_power?: number | null
          slot_4?: string | null
          slot_4_combat_power?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          is_completed?: boolean | null
          raid_name?: string | null
          slot_1?: string | null
          slot_1_combat_power?: number | null
          slot_2?: string | null
          slot_2_combat_power?: number | null
          slot_3?: string | null
          slot_3_combat_power?: number | null
          slot_4?: string | null
          slot_4_combat_power?: number | null
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
