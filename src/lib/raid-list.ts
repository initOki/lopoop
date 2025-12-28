export type RaidInfo = {
  name: string
  minItemLevel: number
  clearGold: number
}

export const raidList: RaidInfo[] = [
  { name: '서막 / 에키드나 하드', minItemLevel: 1640, clearGold: 7200 },
  { name: '베히모스', minItemLevel: 1640, clearGold: 7200 },
  { name: '1막 / 에기르 노말', minItemLevel: 1660, clearGold: 11500 },
  { name: '1막 / 에기르 하드', minItemLevel: 1680, clearGold: 18000 },
  { name: '2막 / 아브렐슈드 노말', minItemLevel: 1670, clearGold: 16500 },
  { name: '2막 / 아브렐슈드 하드', minItemLevel: 1690, clearGold: 23000 },
  { name: '3막 / 모르둠 노말', minItemLevel: 1680, clearGold: 21000 },
  { name: '3막 / 모르둠 하드', minItemLevel: 1700, clearGold: 27000 },
  { name: '4막 / 아르모체 노말', minItemLevel: 1700, clearGold: 33000 },
  { name: '4막 / 아르모체 하드', minItemLevel: 1720, clearGold: 42000 },
  { name: '종막 / 카제로스 노말', minItemLevel: 1710, clearGold: 40000 },
  { name: '종막 / 카제로스 하드', minItemLevel: 1730, clearGold: 52000 },
]
