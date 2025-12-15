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
      }
    }
  }
}

