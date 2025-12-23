/**
 * Input validation and security utilities for custom menu system
 * 요구사항 8.1, 8.2: 사용자당 메뉴 수 제한, 악성 콘텐츠 검증
 */

import DOMPurify from 'isomorphic-dompurify'

export interface SecurityConfig {
  maxMenusPerUser: number
  maxNameLength: number
  maxConfigSize: number
  maxContentLength: number
  allowedProtocols: string[]
  blockedDomains: string[]
  rateLimitWindow: number // milliseconds
  maxActionsPerWindow: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedValue?: any
}

export interface RateLimitEntry {
  userId: string
  actions: number
  windowStart: number
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxMenusPerUser: 20,
  maxNameLength: 100,
  maxConfigSize: 10000, // 10KB
  maxContentLength: 100000, // 100KB
  allowedProtocols: ['http:', 'https:', 'mailto:'],
  blockedDomains: [
    'malware.com',
    'phishing.net',
    'spam.org'
  ],
  rateLimitWindow: 60000, // 1 minute
  maxActionsPerWindow: 30
}

// Rate limiting storage
const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Malicious content patterns to detect
 */
const MALICIOUS_PATTERNS = [
  // Script injection
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  
  // Event handlers
  /on\w+\s*=/gi,
  
  // SQL injection patterns
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  
  // XSS patterns
  /(<|%3C)(\/?)(script|iframe|object|embed|form|input|meta|link)/gi,
  
  // Suspicious URLs
  /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/gi,
  
  // Base64 encoded scripts
  /data:text\/javascript;base64/gi,
  
  // HTML entities that could be used for obfuscation
  /&#x?[0-9a-f]+;/gi
]

/**
 * Suspicious keywords that might indicate malicious intent
 */
const SUSPICIOUS_KEYWORDS = [
  'eval', 'exec', 'system', 'shell_exec', 'passthru',
  'document.cookie', 'localStorage', 'sessionStorage',
  'XMLHttpRequest', 'fetch', 'import', 'require',
  'crypto', 'btoa', 'atob', 'unescape', 'decodeURI'
]

/**
 * Validates and sanitizes menu name input
 */
export function validateMenuName(
  name: string, 
  existingNames: string[] = [],
  config: Partial<SecurityConfig> = {}
): ValidationResult {
  const cfg = { ...DEFAULT_SECURITY_CONFIG, ...config }
  const errors: string[] = []
  const warnings: string[] = []

  // Basic validation
  if (!name || name.trim().length === 0) {
    errors.push('메뉴 이름은 필수입니다')
    return { isValid: false, errors, warnings }
  }

  const trimmedName = name.trim()

  // Length validation
  if (trimmedName.length > cfg.maxNameLength) {
    errors.push(`메뉴 이름은 ${cfg.maxNameLength}자를 초과할 수 없습니다`)
  }

  // Character validation (Korean, English, numbers, safe special chars)
  const allowedCharsRegex = /^[가-힣a-zA-Z0-9\s\-_!@#$%^&*()+=\[\]{}|;:'"<>,.?/~`]+$/
  if (!allowedCharsRegex.test(trimmedName)) {
    errors.push('메뉴 이름에 허용되지 않는 문자가 포함되어 있습니다')
  }

  // Uniqueness validation
  if (existingNames.includes(trimmedName)) {
    errors.push('이미 존재하는 메뉴 이름입니다')
  }

  // Malicious content detection
  const maliciousCheck = detectMaliciousContent(trimmedName)
  if (!maliciousCheck.isValid) {
    errors.push(...maliciousCheck.errors)
  }

  // Sanitize the name
  const sanitizedName = sanitizeText(trimmedName)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedValue: sanitizedName
  }
}

/**
 * Validates menu configuration object
 */
export function validateMenuConfig(
  config: any,
  securityConfig: Partial<SecurityConfig> = {}
): ValidationResult {
  const cfg = { ...DEFAULT_SECURITY_CONFIG, ...securityConfig }
  const errors: string[] = []
  const warnings: string[] = []

  // Size validation
  const configSize = JSON.stringify(config).length
  if (configSize > cfg.maxConfigSize) {
    errors.push(`메뉴 설정이 너무 큽니다 (최대 ${cfg.maxConfigSize} bytes)`)
  }

  // Deep validation of config content
  const sanitizedConfig = sanitizeConfigObject(config, cfg)
  
  // Check for suspicious content in config values
  const configString = JSON.stringify(config)
  const maliciousCheck = detectMaliciousContent(configString)
  if (!maliciousCheck.isValid) {
    errors.push('메뉴 설정에 허용되지 않는 내용이 포함되어 있습니다')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedValue: sanitizedConfig
  }
}

/**
 * Validates URL inputs (for external links, etc.)
 */
export function validateUrl(
  url: string,
  config: Partial<SecurityConfig> = {}
): ValidationResult {
  const cfg = { ...DEFAULT_SECURITY_CONFIG, ...config }
  const errors: string[] = []
  const warnings: string[] = []

  if (!url || url.trim().length === 0) {
    errors.push('URL은 필수입니다')
    return { isValid: false, errors, warnings }
  }

  try {
    const urlObj = new URL(url.trim())
    
    // Protocol validation
    if (!cfg.allowedProtocols.includes(urlObj.protocol)) {
      errors.push(`허용되지 않는 프로토콜입니다: ${urlObj.protocol}`)
    }

    // Domain validation
    const hostname = urlObj.hostname.toLowerCase()
    if (cfg.blockedDomains.some(domain => hostname.includes(domain))) {
      errors.push('차단된 도메인입니다')
    }

    // Suspicious URL patterns
    if (MALICIOUS_PATTERNS.some(pattern => pattern.test(url))) {
      errors.push('의심스러운 URL 패턴이 감지되었습니다')
    }

    // Check for URL shorteners (potential security risk)
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'short.link']
    if (shorteners.some(shortener => hostname.includes(shortener))) {
      warnings.push('단축 URL은 보안상 권장되지 않습니다')
    }

  } catch (error) {
    errors.push('유효하지 않은 URL 형식입니다')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedValue: url.trim()
  }
}

/**
 * Validates HTML content (for custom pages)
 */
export function validateHtmlContent(
  content: string,
  config: Partial<SecurityConfig> = {}
): ValidationResult {
  const cfg = { ...DEFAULT_SECURITY_CONFIG, ...config }
  const errors: string[] = []
  const warnings: string[] = []

  // Length validation
  if (content.length > cfg.maxContentLength) {
    errors.push(`콘텐츠가 너무 큽니다 (최대 ${cfg.maxContentLength} 문자)`)
  }

  // Malicious content detection
  const maliciousCheck = detectMaliciousContent(content)
  if (!maliciousCheck.isValid) {
    errors.push('콘텐츠에 허용되지 않는 내용이 포함되어 있습니다')
  }

  // Sanitize HTML content
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'div', 'span', 'pre', 'code'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
  })

  // Check if content was significantly modified during sanitization
  if (sanitizedContent.length < content.length * 0.8) {
    warnings.push('콘텐츠에서 일부 요소가 보안상 제거되었습니다')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedValue: sanitizedContent
  }
}

/**
 * Detects malicious content patterns
 */
function detectMaliciousContent(input: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check against malicious patterns
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('악성 코드 패턴이 감지되었습니다')
      break
    }
  }

  // Check for suspicious keywords
  const lowerInput = input.toLowerCase()
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter(keyword => 
    lowerInput.includes(keyword.toLowerCase())
  )

  if (foundKeywords.length > 0) {
    warnings.push(`의심스러운 키워드가 감지되었습니다: ${foundKeywords.join(', ')}`)
  }

  // Check for excessive special characters (potential obfuscation)
  const specialCharCount = (input.match(/[^a-zA-Z0-9가-힣\s]/g) || []).length
  const specialCharRatio = specialCharCount / input.length
  
  if (specialCharRatio > 0.3) {
    warnings.push('특수 문자 비율이 높습니다 (난독화 시도 가능성)')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Sanitizes text input
 */
function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
}

/**
 * Recursively sanitizes configuration object
 */
function sanitizeConfigObject(obj: any, config: SecurityConfig): any {
  if (typeof obj === 'string') {
    return sanitizeText(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeConfigObject(item, config))
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeText(key)
      sanitized[sanitizedKey] = sanitizeConfigObject(value, config)
    }
    return sanitized
  }
  
  return obj
}

/**
 * Rate limiting for menu operations
 * 요구사항 8.1: 시스템 과부하 방지
 */
export function checkRateLimit(
  userId: string,
  config: Partial<SecurityConfig> = {}
): { allowed: boolean; remainingActions: number; resetTime: number } {
  const cfg = { ...DEFAULT_SECURITY_CONFIG, ...config }
  const now = Date.now()
  
  // Clean up expired entries
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > cfg.rateLimitWindow) {
      rateLimitMap.delete(key)
    }
  }
  
  // Get or create rate limit entry
  let entry = rateLimitMap.get(userId)
  if (!entry || now - entry.windowStart > cfg.rateLimitWindow) {
    entry = {
      userId,
      actions: 0,
      windowStart: now
    }
    rateLimitMap.set(userId, entry)
  }
  
  // Check if limit exceeded
  const allowed = entry.actions < cfg.maxActionsPerWindow
  const remainingActions = Math.max(0, cfg.maxActionsPerWindow - entry.actions)
  const resetTime = entry.windowStart + cfg.rateLimitWindow
  
  // Increment action count if allowed
  if (allowed) {
    entry.actions++
  }
  
  return {
    allowed,
    remainingActions,
    resetTime
  }
}

/**
 * Comprehensive validation for menu creation/update
 */
export function validateMenuData(data: {
  name: string
  type: string
  config: any
  userId: string
  existingNames?: string[]
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Rate limiting check
  const rateLimit = checkRateLimit(data.userId)
  if (!rateLimit.allowed) {
    errors.push(`요청 한도를 초과했습니다. ${new Date(rateLimit.resetTime).toLocaleTimeString()}에 재시도하세요.`)
  }
  
  // Validate name
  const nameValidation = validateMenuName(data.name, data.existingNames)
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors)
  }
  warnings.push(...nameValidation.warnings)
  
  // Validate config
  const configValidation = validateMenuConfig(data.config)
  if (!configValidation.isValid) {
    errors.push(...configValidation.errors)
  }
  warnings.push(...configValidation.warnings)
  
  // Type-specific validation
  if (data.type === 'external_link' && data.config.links) {
    for (const link of data.config.links) {
      if (link.url) {
        const urlValidation = validateUrl(link.url)
        if (!urlValidation.isValid) {
          errors.push(`링크 "${link.name || link.url}": ${urlValidation.errors.join(', ')}`)
        }
        warnings.push(...urlValidation.warnings)
      }
    }
  }
  
  if (data.type === 'custom_page' && data.config.content) {
    const contentValidation = validateHtmlContent(data.config.content)
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors)
    }
    warnings.push(...contentValidation.warnings)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedValue: {
      name: nameValidation.sanitizedValue || data.name,
      config: configValidation.sanitizedValue || data.config
    }
  }
}

/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
  userId: string
  action: string
  timestamp: Date
  details: any
  severity: 'low' | 'medium' | 'high'
}

/**
 * Logs security events for monitoring
 */
export function logSecurityEvent(entry: Omit<SecurityAuditEntry, 'timestamp'>): void {
  const auditEntry: SecurityAuditEntry = {
    ...entry,
    timestamp: new Date()
  }
  
  // In a real application, this would send to a logging service
  console.warn('Security Event:', auditEntry)
  
  // Store in localStorage for debugging (in production, use proper logging)
  try {
    const existingLogs = JSON.parse(localStorage.getItem('security_audit_log') || '[]')
    existingLogs.push(auditEntry)
    
    // Keep only last 100 entries
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100)
    }
    
    localStorage.setItem('security_audit_log', JSON.stringify(existingLogs))
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}