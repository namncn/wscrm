import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

// Database configuration
// Support both TCP and Socket connections (Socket preferred for shared hosting)
const dbConfig: mysql.PoolOptions = {
  // Use socket if DB_SOCKET_PATH is set, otherwise use TCP
  ...(process.env.DB_SOCKET_PATH 
    ? { socketPath: process.env.DB_SOCKET_PATH }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
      }
  ),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME || 'crm_db',
  charset: 'utf8mb4',
  // Basic pool settings
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'),
  queueLimit: 0,
  connectTimeout: 10000,
}

// Create connection pool
const pool = mysql.createPool(dbConfig)

// Create Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' })

// Database utility functions (keeping for backward compatibility)
export class Database {
  // Execute a query with parameters
  static async query(sql: string, params: any[] = []) {
    try {
      const [rows] = await pool.execute(sql, params)
      return rows
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }

  // Execute a query and return the first row
  static async queryOne(sql: string, params: any[] = []) {
    const rows = await this.query(sql, params) as any[]
    return rows[0] || null
  }

  // Execute an insert query and return the insert ID
  static async insert(sql: string, params: any[] = []) {
    const result = await pool.execute(sql, params) as any
    return result[0].insertId
  }

  // Execute an update query and return affected rows
  static async update(sql: string, params: any[] = []) {
    const result = await pool.execute(sql, params) as any
    return result[0].affectedRows
  }

  // Execute a delete query and return affected rows
  static async delete(sql: string, params: any[] = []) {
    const result = await pool.execute(sql, params) as any
    return result[0].affectedRows
  }

  // Get connection from pool
  static async getConnection() {
    return await pool.getConnection()
  }

  // Close all connections
  static async close() {
    await pool.end()
  }
}

// Test database connection with detailed error logging
export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ MariaDB connection successful')
    console.log('Connection details:', {
      socketPath: (dbConfig as any).socketPath || `tcp://${dbConfig.host}:${dbConfig.port}`,
      user: dbConfig.user,
      database: dbConfig.database,
    })
    connection.release()
    return true
  } catch (error: any) {
    console.error('❌ MariaDB connection failed')
    console.error('Error details:', {
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      sqlMessage: error?.sqlMessage,
      message: error?.message,
      stack: error?.stack,
    })
    console.error('Connection config:', {
      socketPath: (dbConfig as any).socketPath,
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      passwordSet: !!dbConfig.password,
    })
    return false
  }
}

export default db