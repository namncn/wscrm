import { defineConfig } from 'drizzle-kit'

// Drizzle-kit requires host and port, even when using socket connection
// When DB_SOCKET_PATH is set, we use localhost with TCP (which will use socket internally)
// When DB_SOCKET_PATH is not set, we use the provided host and port
const dbCredentials: any = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_db',
}

// Always provide host and port (required by drizzle-kit)
// Note: drizzle-kit may not support socketPath directly, so we use TCP connection
// If DB_SOCKET_PATH is set, try using localhost with TCP (MySQL may route to socket internally)
// If not set, use the provided DB_HOST and DB_PORT
dbCredentials.host = process.env.DB_HOST || 'localhost'
dbCredentials.port = parseInt(process.env.DB_PORT || '3306')

// Note: drizzle-kit doesn't support socketPath in dbCredentials
// If you must use socket connection, you may need to configure MySQL to accept TCP on localhost
// or use a different approach like importing schema.sql directly

export default defineConfig({
  schema: './src/lib/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials,
  verbose: true,
  strict: true,
})
