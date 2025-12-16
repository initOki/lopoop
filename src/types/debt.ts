export interface Debt {
  id: string
  debtor: string // 빚진 사람
  creditor: string // 빚을 받아야 하는 사람
  amount?: number // 금액 (선택적)
  item?: string // 아이템 (선택적)
  description?: string // 설명
  createdAt: Date
  isPaid: boolean // 갚았는지 여부
}

