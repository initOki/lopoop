// 서폿 직업 목록
const SUPPORT_CLASSES = ['바드', '홀리나이트', '도화가', '발키리']

// 딜러 직업 목록
// const DEALER_CLASSES = [
//   '버서커',
//   '디스트로이어',
//   '워로드',
//   '슬레이어',
//   '아르카나',
//   '서머너',
//   '소서리스',
//   '배틀마스터',
//   '인파이터',
//   '기공사',
//   '창술사',
//   '스트라이커',
//   '브레이커',
//   '데빌헌터',
//   '블래스터',
//   '호크아이',
//   '스카우터',
//   '건슬링어',
//   '데모닉',
//   '블레이드',
//   '리퍼',
//   '소울이터',
//   '기상술사',
//   '환수사',
//   '가디언나이트',
// ]

/**
 * 직업이 서폿인지 확인
 */
export function isSupport(className: string): boolean {
  return SUPPORT_CLASSES.includes(className)
}

/**
 * 직업 역할 가져오기
 */
export function getClassRole(className: string): 'support' | 'dealer' {
  return isSupport(className) ? 'support' : 'dealer'
}

/**
 * 캐릭터 표시 형식 (드롭박스용)
 */
export function formatCharacterForSelect(
  name: string,
  className: string,
  itemLevel: number,
  stats?: number,
): string {
  const itemLevelStr = itemLevel.toLocaleString()
  if (stats) {
    return `${name} / ${className} (${itemLevelStr} / ${stats.toLocaleString()})`
  }
  return `${name} / ${className} (${itemLevelStr})`
}

/**
 * 캐릭터 표시 형식 (테이블용)
 */
export function formatCharacterForTable(
  name: string,
  className: string,
  stats?: number,
): string {
  if (stats) {
    return `${name} / ${className} / ${stats}`
  }
  return `${name} / ${className}`
}
