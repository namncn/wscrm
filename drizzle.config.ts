import { defineConfig } from 'drizzle-kit'

// Support both TCP and Socket connections (Socket preferred for shared hosting)
const dbCredentials: any = {}

if (process.env.DB_SOCKET_PATH) {
  // Use socket connection if DB_SOCKET_PATH is set
  dbCredentials.socketPath = process.env.DB_SOCKET_PATH
} else {
  // Use TCP connection
  dbCredentials.host = process.env.DB_HOST || 'localhost'
  dbCredentials.port = parseInt(process.env.DB_PORT || '3306')
}

dbCredentials.user = process.env.DB_USER || 'root'
dbCredentials.password = process.env.DB_PASSWORD || ''
dbCredentials.database = process.env.DB_NAME || 'crm_db'

export default defineConfig({
  schema: './src/lib/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials,
  verbose: true,
  strict: true,
})
