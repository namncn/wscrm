/**
 * Retry Queue System for Control Panel Sync
 * Manages failed syncs and retries them automatically
 */

import { db } from '@/lib/database'
import { hosting } from '@/lib/schema'
import { eq, and, lte } from 'drizzle-orm'
import { ControlPanelSyncService } from './sync-service'

export interface RetryQueueItem {
  hostingId: number
  retryCount: number
  lastAttemptAt: Date | null
  nextRetryAt: Date
  error: string
}

export class RetryQueue {
  private static readonly MAX_RETRIES = 5
  private static readonly RETRY_DELAYS = [
    5 * 60 * 1000,      // 5 minutes
    15 * 60 * 1000,     // 15 minutes
    30 * 60 * 1000,     // 30 minutes
    60 * 60 * 1000,     // 1 hour
    2 * 60 * 60 * 1000, // 2 hours
  ]

  /**
   * Add hosting to retry queue
   */
  static async addToQueue(hostingId: number, error: string): Promise<void> {
    try {
      const hostingRecord = await db.select()
        .from(hosting)
        .where(eq(hosting.id, hostingId))
        .limit(1)

      if (!hostingRecord[0]) {
        console.error(`[RetryQueue] Hosting ${hostingId} not found`)
        return
      }

      // Calculate next retry time based on current retry count
      const retryCount = this.getRetryCount(hostingRecord[0])
      const delay = this.RETRY_DELAYS[Math.min(retryCount, this.RETRY_DELAYS.length - 1)]
      const nextRetryAt = new Date(Date.now() + delay)

      // Update hosting record with retry info
      await db.update(hosting)
        .set({
          syncStatus: 'PENDING',
          syncError: error,
          lastSyncedAt: new Date(),
          // Store retry info in syncMetadata
          syncMetadata: {
            ...(hostingRecord[0].syncMetadata as any || {}),
            retryCount: retryCount + 1,
            nextRetryAt: nextRetryAt.toISOString(),
            lastError: error,
          },
        })
        .where(eq(hosting.id, hostingId))

      console.log(`[RetryQueue] Added hosting ${hostingId} to retry queue. Next retry at: ${nextRetryAt.toISOString()}`)
    } catch (error) {
      console.error(`[RetryQueue] Error adding hosting ${hostingId} to queue:`, error)
    }
  }

  /**
   * Process retry queue - retry failed syncs that are due
   */
  static async processQueue(limit: number = 10): Promise<{
    processed: number
    succeeded: number
    failed: number
  }> {
    try {
      const now = new Date()

      // Get hostings that are due for retry
      const hostingsToRetry = await db.select()
        .from(hosting)
        .where(
          and(
            eq(hosting.syncStatus, 'FAILED'),
            // Check if nextRetryAt is in the past or null
            // Note: We'll filter in code since Drizzle doesn't support JSON field queries easily
          )
        )
        .limit(limit * 2) // Get more to filter by nextRetryAt

      // Filter by nextRetryAt
      const dueHostings = hostingsToRetry.filter(h => {
        const metadata = h.syncMetadata as any
        if (!metadata || !metadata.nextRetryAt) {
          return true // Retry if no nextRetryAt set
        }
        const nextRetryAt = new Date(metadata.nextRetryAt)
        return nextRetryAt <= now
      }).slice(0, limit)

      if (dueHostings.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 }
      }

      console.log(`[RetryQueue] Processing ${dueHostings.length} hostings from retry queue`)

      let succeeded = 0
      let failed = 0

      for (const hostingRecord of dueHostings) {
        const retryCount = this.getRetryCount(hostingRecord)

        // Skip if exceeded max retries
        if (retryCount >= this.MAX_RETRIES) {
          console.warn(`[RetryQueue] Hosting ${hostingRecord.id} exceeded max retries (${retryCount})`)
          await db.update(hosting)
            .set({
              syncError: `Max retries (${this.MAX_RETRIES}) exceeded. Last error: ${hostingRecord.syncError || 'Unknown'}`,
            })
            .where(eq(hosting.id, hostingRecord.id))
          failed++
          continue
        }

        try {
          // Attempt sync
          const result = await ControlPanelSyncService.syncHostingToControlPanel(hostingRecord.id)

          if (result.success) {
            succeeded++
            console.log(`[RetryQueue] Successfully synced hosting ${hostingRecord.id} after ${retryCount} retries`)
          } else {
            // Add back to queue with incremented retry count
            await this.addToQueue(hostingRecord.id, result.error || 'Unknown error')
            failed++
          }
        } catch (error: any) {
          // Add back to queue
          await this.addToQueue(hostingRecord.id, error.message || 'Unknown error')
          failed++
        }
      }

      return {
        processed: dueHostings.length,
        succeeded,
        failed,
      }
    } catch (error) {
      console.error('[RetryQueue] Error processing queue:', error)
      return { processed: 0, succeeded: 0, failed: 0 }
    }
  }

  /**
   * Get retry count from hosting record
   */
  private static getRetryCount(hostingRecord: any): number {
    const metadata = hostingRecord.syncMetadata as any
    return metadata?.retryCount || 0
  }

  /**
   * Get queue stats
   */
  static async getQueueStats(): Promise<{
    total: number
    due: number
    exceeded: number
  }> {
    try {
      const now = new Date()

      const failedHostings = await db.select()
        .from(hosting)
        .where(eq(hosting.syncStatus, 'FAILED'))

      let due = 0
      let exceeded = 0

      for (const h of failedHostings) {
        const metadata = h.syncMetadata as any
        const retryCount = metadata?.retryCount || 0

        if (retryCount >= this.MAX_RETRIES) {
          exceeded++
        } else {
          const nextRetryAt = metadata?.nextRetryAt ? new Date(metadata.nextRetryAt) : null
          if (!nextRetryAt || nextRetryAt <= now) {
            due++
          }
        }
      }

      return {
        total: failedHostings.length,
        due,
        exceeded,
      }
    } catch (error) {
      console.error('[RetryQueue] Error getting queue stats:', error)
      return { total: 0, due: 0, exceeded: 0 }
    }
  }

  /**
   * Retry specific hosting immediately (bypass queue)
   */
  static async retryNow(hostingId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await ControlPanelSyncService.syncHostingToControlPanel(hostingId)
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

