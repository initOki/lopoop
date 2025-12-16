export interface Database {
  public: {
    Tables: {
      debts: {
        Row: {
          id: string
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

      schedules: {
        Row: {
          id: number
          raid_name: string
          slot_1: string | null
          slot_2: string | null
          slot_3: string | null
          slot_4: string | null
          is_completed: boolean
          created_at: string
        }
        Insert: {
          id?: number
          raid_name: string
          slot_1?: string | null
          slot_2?: string | null
          slot_3?: string | null
          slot_4?: string | null
          is_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          raid_name?: string
          slot_1?: string | null
          slot_2?: string | null
          slot_3?: string | null
          slot_4?: string | null
          is_completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
