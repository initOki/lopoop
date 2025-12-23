/**
 * Network error handling utilities for custom menu system
 * 요구사항 7.5: 네트워크 오류 처리 및 복구
 */

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

export interface NetworkState {
  isOnline: boolean
  isConnected: boolean
  lastConnectedAt: Date | null
}

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'reorder'
  data: any
  timestamp: Date
  userId: string
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
}

/**
 * Network state management
 */
class NetworkStateManager {
  private state: NetworkState = {
    isOnline: navigator.onLine,
    isConnected: true,
    lastConnectedAt: new Date()
  }

  private listeners: ((state: NetworkState) => void)[] = []

  constructor() {
    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  private handleOnline() {
    this.updateState({
      isOnline: true,
      isConnected: true,
      lastConnectedAt: new Date()
    })
  }

  private handleOffline() {
    this.updateState({
      isOnline: false,
      isConnected: false
    })
  }

  private updateState(updates: Partial<NetworkState>) {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(listener => listener(this.state))
  }

  public getState(): NetworkState {
    return { ...this.state }
  }

  public subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  public setConnected(connected: boolean) {
    this.updateState({
      isConnected: connected,
      lastConnectedAt: connected ? new Date() : this.state.lastConnectedAt
    })
  }
}

export const networkStateManager = new NetworkStateManager()

/**
 * Offline action queue management
 */
class OfflineActionQueue {
  private readonly STORAGE_KEY = 'custom_menus_offline_actions'
  private actions: OfflineAction[] = []

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.actions = JSON.parse(stored).map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }))
      }
    } catch (error) {
      console.error('Error loading offline actions from storage:', error)
      this.actions = []
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.actions))
    } catch (error) {
      console.error('Error saving offline actions to storage:', error)
    }
  }

  public addAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }
    
    this.actions.push(newAction)
    this.saveToStorage()
  }

  public getActions(userId?: string): OfflineAction[] {
    return userId 
      ? this.actions.filter(action => action.userId === userId)
      : [...this.actions]
  }

  public removeAction(actionId: string) {
    this.actions = this.actions.filter(action => action.id !== actionId)
    this.saveToStorage()
  }

  public clearActions(userId?: string) {
    if (userId) {
      this.actions = this.actions.filter(action => action.userId !== userId)
    } else {
      this.actions = []
    }
    this.saveToStorage()
  }

  public hasActions(userId?: string): boolean {
    return this.getActions(userId).length > 0
  }
}

export const offlineActionQueue = new OfflineActionQueue()

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.baseDelay * Math.pow(options.backoffFactor, attempt)
  return Math.min(delay, options.maxDelay)
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return true
  }

  // Supabase specific errors
  if (error.code) {
    // Temporary server errors (5xx)
    if (error.code >= 500 && error.code < 600) {
      return true
    }
    
    // Rate limiting
    if (error.code === 429) {
      return true
    }
    
    // Connection timeout
    if (error.code === 'PGRST301') {
      return true
    }
  }

  // Connection refused, timeout, etc.
  if (error.message) {
    const retryableMessages = [
      'fetch failed',
      'network error',
      'connection refused',
      'timeout',
      'temporary failure',
      'service unavailable'
    ]
    
    const message = error.message.toLowerCase()
    return retryableMessages.some(msg => message.includes(msg))
  }

  return false
}

/**
 * Executes a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: any

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await fn()
      
      // If successful and we had previous failures, mark as connected
      if (attempt > 0) {
        networkStateManager.setConnected(true)
      }
      
      return result
    } catch (error) {
      lastError = error
      
      // Mark as disconnected on network errors
      if (isRetryableError(error)) {
        networkStateManager.setConnected(false)
      }

      // Don't retry on the last attempt
      if (attempt === opts.maxRetries) {
        break
      }

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        break
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, opts)
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error instanceof Error ? error.message : String(error))
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Executes a function with offline support
 * If offline, queues the action for later execution
 */
export async function withOfflineSupport<T>(
  fn: () => Promise<T>,
  offlineAction: Omit<OfflineAction, 'id' | 'timestamp'>,
  options: Partial<RetryOptions> = {}
): Promise<T | null> {
  const networkState = networkStateManager.getState()
  
  // If offline, queue the action
  if (!networkState.isOnline || !networkState.isConnected) {
    console.log('Offline mode: queuing action for later execution')
    offlineActionQueue.addAction(offlineAction)
    return null
  }

  try {
    return await withRetry(fn, options)
  } catch (error) {
    // If the error is network-related and we're now offline, queue the action
    if (isRetryableError(error) && !networkStateManager.getState().isConnected) {
      console.log('Network error: queuing action for later execution')
      offlineActionQueue.addAction(offlineAction)
      return null
    }
    
    throw error
  }
}

/**
 * Processes queued offline actions when connection is restored
 */
export async function processOfflineActions(
  userId: string,
  actionHandlers: {
    create: (data: any) => Promise<any>
    update: (data: any) => Promise<any>
    delete: (data: any) => Promise<any>
    reorder: (data: any) => Promise<any>
  }
): Promise<{ processed: number; failed: number }> {
  const actions = offlineActionQueue.getActions(userId)
  let processed = 0
  let failed = 0

  console.log(`Processing ${actions.length} offline actions for user ${userId}`)

  for (const action of actions) {
    try {
      const handler = actionHandlers[action.type]
      if (handler) {
        await withRetry(() => handler(action.data), { maxRetries: 2 })
        offlineActionQueue.removeAction(action.id)
        processed++
        console.log(`Processed offline action: ${action.type}`)
      } else {
        console.error(`No handler for action type: ${action.type}`)
        offlineActionQueue.removeAction(action.id)
        failed++
      }
    } catch (error) {
      console.error(`Failed to process offline action ${action.id}:`, error)
      failed++
      
      // Remove actions that are too old (older than 24 hours)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      if (Date.now() - action.timestamp.getTime() > maxAge) {
        console.log(`Removing expired offline action: ${action.id}`)
        offlineActionQueue.removeAction(action.id)
      }
    }
  }

  return { processed, failed }
}

/**
 * Hook for monitoring network state
 */
export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetworkState>(
    networkStateManager.getState()
  )

  useEffect(() => {
    const unsubscribe = networkStateManager.subscribe(setNetworkState)
    return unsubscribe
  }, [])

  return networkState
}

// React import for the hook
import { useState, useEffect } from 'react'