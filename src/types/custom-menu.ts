import type { Tables, TablesInsert, TablesUpdate } from './database'

// Menu types enum
export enum MenuType {
  GROUP = 'group',
  DASHBOARD = 'dashboard',
  EXTERNAL_LINK = 'external_link',
  CUSTOM_PAGE = 'custom_page',
  PROJECT = 'project'
}

// Base menu configuration interface
export interface MenuConfig {
  [key: string]: any
}

// Menu type-specific configurations
export interface GroupMenuConfig extends MenuConfig {
  description?: string
  isPrivate: boolean
  allowMemberInvite: boolean
  features: {
    scheduling: boolean
    debtManagement: boolean
  }
}

export interface DashboardMenuConfig extends MenuConfig {
  layout: 'grid' | 'list' | 'custom'
  widgets: Widget[]
}

export interface ExternalLinkMenuConfig extends MenuConfig {
  links: {
    id: string
    name: string
    url: string
    description?: string
    icon?: string
  }[]
  layout: 'grid' | 'list'
}

export interface CustomPageMenuConfig extends MenuConfig {
  content: string // HTML/Markdown content
  allowEdit: boolean
  template: 'blank' | 'document' | 'wiki'
}

export interface ProjectMenuConfig extends MenuConfig {
  description?: string
  status: 'active' | 'completed' | 'archived'
  features: {
    tasks: boolean
    timeline: boolean
    files: boolean
    discussions: boolean
  }
}

// Database table types
export type CustomMenu = Tables<'custom_menus'>
export type CustomMenuInsert = TablesInsert<'custom_menus'>
export type CustomMenuUpdate = TablesUpdate<'custom_menus'>

export type MenuMember = Tables<'menu_members'>
export type MenuMemberInsert = TablesInsert<'menu_members'>
export type MenuMemberUpdate = TablesUpdate<'menu_members'>

// Component prop interfaces
export interface MenuManagerProps {
  userId: string
}

export interface MenuCreatorProps {
  userId: string
  onMenuCreate: (menu: Omit<CustomMenu, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

export interface MenuFormData {
  name: string
  type: MenuType
  config: MenuConfig
}

export interface DynamicNavigationProps {
  customMenus: CustomMenu[]
  onMenuClick: (menuId: string) => void
}

export interface NavigationItem {
  id: string
  name: string
  icon: any // Component type
  path: string
  isCustom: boolean
}

export interface MenuComponentProps {
  menu: CustomMenu
  onUpdate: (updates: Partial<CustomMenu>) => void
}

export interface MenuTypeConfig {
  component: any // Component type
  defaultConfig: MenuConfig
  icon: any // Component type
  features: string[]
}

export interface RealtimeMenuSyncProps {
  userId: string
  onMenusUpdate: (menus: CustomMenu[]) => void
}

export interface MenuSubscription {
  channel: any // RealtimeChannel type from Supabase
  subscription: any // Subscription type from Supabase
}

// Widget types for dashboard menus
export interface Widget {
  id: string
  type: WidgetType
  position: Position
  config: WidgetConfig
}

export type WidgetType = 'chart' | 'table' | 'counter' | 'calendar' | 'progress' | 'goals'

export interface Position {
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetConfig {
  [key: string]: any
}

export interface LayoutConfig {
  type: 'grid' | 'list' | 'custom'
  columns?: number
  gap?: number
}

// Group menu specific types
export interface GroupSchedule {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  participants: string[]
  type: 'raid' | 'meeting' | 'event'
}

// Menu validation types
export interface MenuValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface MenuLimits {
  maxMenusPerUser: number
  maxNameLength: number
  maxConfigSize: number
}

// Default configurations for each menu type
export const DEFAULT_MENU_CONFIGS: Record<MenuType, MenuConfig> = {
  [MenuType.GROUP]: {
    description: '',
    isPrivate: false,
    allowMemberInvite: true,
    features: {
      scheduling: true,
      debtManagement: true
    }
  } as GroupMenuConfig,
  
  [MenuType.DASHBOARD]: {
    layout: 'grid',
    widgets: []
  } as DashboardMenuConfig,
  
  [MenuType.EXTERNAL_LINK]: {
    links: [],
    layout: 'list'
  } as ExternalLinkMenuConfig,
  
  [MenuType.CUSTOM_PAGE]: {
    content: '',
    allowEdit: true,
    template: 'blank'
  } as CustomPageMenuConfig,
  
  [MenuType.PROJECT]: {
    description: '',
    status: 'active',
    features: {
      tasks: true,
      timeline: false,
      files: false,
      discussions: true
    }
  } as ProjectMenuConfig
}