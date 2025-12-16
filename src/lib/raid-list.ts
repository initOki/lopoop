export type RaidInfo = {
  name: string
  minItemLevel: number
}

export const raidList: RaidInfo[] = [
  { name: '서막 / 에키드나 하드', minItemLevel: 1640 },
  { name: '베히모스', minItemLevel: 1660 },
  { name: '1막 / 에기르 노말', minItemLevel: 1660 },
  { name: '1막 / 에기르 하드', minItemLevel: 1680 },
  { name: '2막 / 아브렐슈드 노말', minItemLevel: 1670 },
  { name: '2막 / 아브렐슈드 하드', minItemLevel: 1690 },
  { name: '3막 / 모르둠 노말', minItemLevel: 1680 },
  { name: '3막 / 모르둠 하드', minItemLevel: 1700 },
  { name: '4막 / 아르모체 노말', minItemLevel: 1700 },
  { name: '4막 / 아르모체 하드', minItemLevel: 1720 },
  { name: '종막 / 카제로스 노말', minItemLevel: 1710 },
  { name: '종막 / 카제로스 하드', minItemLevel: 1730 },
]