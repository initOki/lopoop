import { Users, FileText } from 'lucide-react'
import type {
  CustomMenu,
  MenuComponentProps,
  MenuTypeConfig,
} from '../types/custom-menu'
import { MenuType } from '../types/custom-menu'

// Import menu type components
import { GroupMenuComponent } from './menu-types/GroupMenuComponent'

// Menu type configuration registry
const MENU_TYPE_CONFIGS: Record<MenuType, MenuTypeConfig> = {
  [MenuType.GROUP]: {
    component: GroupMenuComponent,
    defaultConfig: {
      description: '',
      isPrivate: false,
      allowMemberInvite: true,
      features: {
        announcements: true,
        scheduling: true,
        fileSharing: false,
        chat: true,
      },
    },
    icon: Users,
    features: ['멤버 관리', '공지사항', '그룹 스케줄링', '채팅'],
  },
}

interface MenuTypeFactoryProps extends MenuComponentProps {
  menu: CustomMenu
  onUpdate: (updates: Partial<CustomMenu>) => void
}

export function MenuTypeFactory({ menu, onUpdate }: MenuTypeFactoryProps) {
  const menuType = menu.type as MenuType
  const config = MENU_TYPE_CONFIGS[menuType]

  if (!config) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            지원되지 않는 메뉴 타입
          </h3>
          <p className="text-gray-600">
            '{menuType}' 타입은 아직 지원되지 않습니다.
          </p>
        </div>
      </div>
    )
  }

  const MenuComponent = config.component

  return (
    <div className="space-y-4">
      {/* Menu type info header */}
      <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <config.icon className="w-5 h-5 text-cyan-600" />
          <h2 className="text-lg font-semibold text-white">{menu.name}</h2>
        </div>
        {/* <div className="flex flex-wrap gap-2">
          {config.features.map((feature, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800"
            >
              {feature}
            </span>
          ))}
        </div> */}
      </div>

      {/* Menu-specific component */}
      <MenuComponent menu={menu} onUpdate={onUpdate} />
    </div>
  )
}

// Export utility functions for getting menu type configurations
export function getMenuTypeConfig(menuType: MenuType): MenuTypeConfig | null {
  return MENU_TYPE_CONFIGS[menuType] || null
}

export function getDefaultConfigForType(menuType: MenuType) {
  const config = MENU_TYPE_CONFIGS[menuType]
  return config ? config.defaultConfig : {}
}

export function getMenuTypeIcon(menuType: MenuType) {
  const config = MENU_TYPE_CONFIGS[menuType]
  return config ? config.icon : FileText
}

export function getMenuTypeFeatures(menuType: MenuType): string[] {
  const config = MENU_TYPE_CONFIGS[menuType]
  return config ? config.features : []
}

export function getAllMenuTypes(): MenuType[] {
  return Object.keys(MENU_TYPE_CONFIGS) as MenuType[]
}

export default MenuTypeFactory
