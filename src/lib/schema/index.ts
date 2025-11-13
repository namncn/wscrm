import { mysqlTable, varchar, timestamp, decimal, int, text, json, date, mysqlEnum, tinyint } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

// Users table
export const users = mysqlTable('users', {
  id: int('id').primaryKey().notNull().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['ADMIN', 'USER']).default('USER'),
  phone: varchar('phone', { length: 20 }),
  company: varchar('company', { length: 255 }),
  address: text('address'),
  bio: text('bio'),
  emailVerified: mysqlEnum('emailVerified', ['YES', 'NO']).default('NO'),
  verificationToken: varchar('verificationToken', { length: 255 }),
  pendingEmail: varchar('pendingEmail', { length: 255 }),
  pendingEmailToken: varchar('pendingEmailToken', { length: 255 }),
  pendingEmailRequestedAt: timestamp('pendingEmailRequestedAt'),
  resetToken: varchar('resetToken', { length: 255 }),
  resetTokenExpiry: timestamp('resetTokenExpiry'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Customers table
export const customers = mysqlTable('customers', {
  id: int('id').primaryKey().notNull().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  company: varchar('company', { length: 255 }),
  taxCode: varchar('taxCode', { length: 50 }),
  companyEmail: varchar('companyEmail', { length: 255 }),
  companyAddress: text('companyAddress'),
  companyPhone: varchar('companyPhone', { length: 20 }),
  companyTaxCode: varchar('companyTaxCode', { length: 50 }),
  status: mysqlEnum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  userId: int('userId'),
  emailVerified: mysqlEnum('emailVerified', ['YES', 'NO']).default('NO'),
  verificationToken: varchar('verificationToken', { length: 255 }),
  pendingEmail: varchar('pendingEmail', { length: 255 }),
  pendingEmailToken: varchar('pendingEmailToken', { length: 255 }),
  pendingEmailRequestedAt: timestamp('pendingEmailRequestedAt'),
  resetToken: varchar('resetToken', { length: 255 }),
  resetTokenExpiry: timestamp('resetTokenExpiry'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Domain table
export const domain = mysqlTable('domain', {
  id: int('id').primaryKey().notNull().autoincrement(),
  domainName: varchar('domainName', { length: 255 }).notNull().unique(),
  registrar: varchar('registrar', { length: 255 }),
  registrationDate: date('registrationDate'),
  expiryDate: date('expiryDate'),
  status: mysqlEnum('status', ['ACTIVE', 'EXPIRED', 'SUSPENDED']).default('ACTIVE'),
  price: decimal('price', { precision: 10, scale: 2 }),
  customerId: int('customerId'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Hosting table
export const hosting = mysqlTable('hosting', {
  id: int('id').primaryKey().notNull().autoincrement(),
  planName: varchar('planName', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  storage: int('storage').notNull(),
  bandwidth: int('bandwidth').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  customerId: int('customerId'),
  expiryDate: date('expiryDate'),
  serverLocation: varchar('serverLocation', { length: 255 }),
  addonDomain: varchar('addonDomain', { length: 50 }).default('Unlimited'),
  subDomain: varchar('subDomain', { length: 50 }).default('Unlimited'),
  ftpAccounts: varchar('ftpAccounts', { length: 50 }).default('Unlimited'),
  databases: varchar('databases', { length: 50 }).default('Unlimited'),
  hostingType: varchar('hostingType', { length: 255 }).default('VPS Hosting'),
  operatingSystem: varchar('operatingSystem', { length: 255 }).default('Linux'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// VPS table
export const vps = mysqlTable('vps', {
  id: int('id').primaryKey().notNull().autoincrement(),
  planName: varchar('planName', { length: 255 }).notNull(),
  ipAddress: varchar('ipAddress', { length: 45 }),
  cpu: int('cpu').notNull(),
  ram: int('ram').notNull(),
  storage: int('storage').notNull(),
  bandwidth: int('bandwidth').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  customerId: int('customerId'),
  expiryDate: date('expiryDate'),
  os: varchar('os', { length: 255 }),
  serverLocation: varchar('serverLocation', { length: 255 }),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Orders table
export const orders = mysqlTable('orders', {
  id: int('id').primaryKey().notNull().autoincrement(),
  customerId: int('customerId').notNull(),
  userId: int('userId').notNull(),
  totalAmount: decimal('totalAmount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  paymentMethod: mysqlEnum('paymentMethod', ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET']).default('CASH'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Order Items table
export const orderItems = mysqlTable('order_items', {
  id: int('id').primaryKey().notNull().autoincrement(),
  orderId: int('orderId').notNull(),
  serviceId: int('serviceId').notNull(),
  serviceType: mysqlEnum('serviceType', ['DOMAIN', 'HOSTING', 'VPS']).notNull(),
  quantity: int('quantity').default(1),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  serviceData: json('serviceData'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Contracts table
export const contracts = mysqlTable('contracts', {
  id: int('id').primaryKey().notNull().autoincrement(),
  contractNumber: varchar('contractNumber', { length: 50 }).notNull(),
  orderId: int('orderId').notNull(),
  customerId: int('customerId').notNull(),
  userId: int('userId').notNull(),
  startDate: date('startDate').notNull(),
  endDate: date('endDate').notNull(),
  totalValue: int('totalValue').notNull(),
  status: mysqlEnum('status', ['ACTIVE', 'EXPIRED', 'CANCELLED']).default('ACTIVE'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Contract-Domain junction table
export const contractDomains = mysqlTable('contract_domains', {
  id: int('id').primaryKey().notNull().autoincrement(),
  contractId: int('contractId').notNull(),
  domainId: int('domainId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
})

// Contract-Hosting junction table
export const contractHostings = mysqlTable('contract_hostings', {
  id: int('id').primaryKey().notNull().autoincrement(),
  contractId: int('contractId').notNull(),
  hostingId: int('hostingId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
})

// Contract-VPS junction table
export const contractVpss = mysqlTable('contract_vpss', {
  id: int('id').primaryKey().notNull().autoincrement(),
  contractId: int('contractId').notNull(),
  vpsId: int('vpsId').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
})

// Cart table
export const cart = mysqlTable('cart', {
  id: int('id').primaryKey().notNull().autoincrement(),
  userId: int('userId').notNull(),
  serviceId: int('serviceId').notNull(),
  serviceType: mysqlEnum('serviceType', ['DOMAIN', 'HOSTING', 'VPS']).notNull(),
  serviceName: varchar('serviceName', { length: 255 }).notNull(),
  quantity: int('quantity').default(1),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  serviceData: json('serviceData'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Payments table
export const payments = mysqlTable('payments', {
  id: int('id').primaryKey().notNull().autoincrement(),
  orderId: int('orderId').notNull(),
  customerId: int('customerId').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).default('PENDING'),
  paymentMethod: varchar('paymentMethod', { length: 50 }),
  transactionId: varchar('transactionId', { length: 255 }),
  paymentData: json('paymentData'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

export const invoices = mysqlTable('invoices', {
  id: int('id').primaryKey().notNull().autoincrement(),
  invoiceNumber: varchar('invoiceNumber', { length: 50 }).notNull().unique(),
  customerId: int('customerId').notNull(),
  status: mysqlEnum('status', ['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE', 'PAID']).default('DRAFT'),
  issueDate: date('issueDate').notNull(),
  dueDate: date('dueDate').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('VND'),
  paymentTerms: varchar('paymentTerms', { length: 50 }),
  paymentMethod: mysqlEnum('paymentMethod', ['CASH', 'BANK_TRANSFER']).default('BANK_TRANSFER'),
  notes: text('notes'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 12, scale: 2 }).notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  paid: decimal('paid', { precision: 12, scale: 2 }).notNull().default('0'),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

export const invoiceItems = mysqlTable('invoice_items', {
  id: int('id').primaryKey().notNull().autoincrement(),
  invoiceId: int('invoiceId').notNull(),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unitPrice', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('taxRate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxLabel: varchar('taxLabel', { length: 20 }),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

export const invoiceSchedules = mysqlTable('invoice_schedules', {
  id: int('id').primaryKey().notNull().autoincrement(),
  invoiceId: int('invoiceId').notNull(),
  enabled: tinyint('enabled').notNull().default(1).$type<boolean>(),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  intervalDays: int('intervalDays'),
  sendTime: varchar('sendTime', { length: 8 }),
  startDate: date('startDate'),
  daysBeforeDue: int('daysBeforeDue'),
  ccAccountingTeam: tinyint('ccAccountingTeam').notNull().default(0).$type<boolean>(),
  lastSentAt: timestamp('lastSentAt'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

export const invoicePayments = mysqlTable('invoice_payments', {
  id: int('id').primaryKey().notNull().autoincrement(),
  invoiceId: int('invoiceId').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  method: varchar('method', { length: 50 }),
  note: text('note'),
  paidAt: timestamp('paidAt').defaultNow(),
  createdAt: timestamp('createdAt').defaultNow(),
})

// Settings table - Stores system settings as JSON
export const settings = mysqlTable('settings', {
  id: int('id').primaryKey().notNull().autoincrement(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: json('value').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Email Notifications table - Queue for sending emails
export const emailNotifications = mysqlTable('email_notifications', {
  id: int('id').primaryKey().notNull().autoincrement(),
  customerId: int('customerId').notNull(),
  serviceId: int('serviceId').notNull(),
  serviceType: mysqlEnum('serviceType', ['DOMAIN', 'HOSTING', 'VPS']).notNull(),
  notificationType: mysqlEnum('notificationType', ['EXPIRING_SOON_1', 'EXPIRING_SOON_2', 'EXPIRING_SOON_3', 'EXPIRED', 'DELETION_WARNING', 'DELETED']).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  content: text('content').notNull(),
  recipientEmail: varchar('recipientEmail', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED']).default('PENDING'),
  scheduledAt: timestamp('scheduledAt'),
  sentAt: timestamp('sentAt'),
  errorMessage: text('errorMessage'),
  retryCount: int('retryCount').default(0),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})

// Websites table
export const websites = mysqlTable('websites', {
  id: int('id').primaryKey().notNull().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  domainId: int('domainId'),
  hostingId: int('hostingId'),
  vpsId: int('vpsId'),
  contractId: int('contractId'),
  orderId: int('orderId'),
  customerId: int('customerId').notNull(),
  status: mysqlEnum('status', ['LIVE', 'DOWN', 'MAINTENANCE']).default('LIVE'),
  description: text('description'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow(),
})


// Relations
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  orders: many(orders),
  contracts: many(contracts),
  cart: many(cart),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  orders: many(orders),
  contracts: many(contracts),
  payments: many(payments),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
  contracts: many(contracts),
  payments: many(payments),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}))

export const contractsRelations = relations(contracts, ({ one }) => ({
  order: one(orders, {
    fields: [contracts.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [contracts.userId],
    references: [users.id],
  }),
}))

export const cartRelations = relations(cart, ({ one }) => ({
  user: one(users, {
    fields: [cart.userId],
    references: [users.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  schedule: many(invoiceSchedules),
  payments: many(invoicePayments),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}))

export const invoiceSchedulesRelations = relations(invoiceSchedules, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceSchedules.invoiceId],
    references: [invoices.id],
  }),
}))

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}))

export const emailNotificationsRelations = relations(emailNotifications, ({ one }) => ({
  customer: one(customers, {
    fields: [emailNotifications.customerId],
    references: [customers.id],
  }),
}))

export const websitesRelations = relations(websites, ({ one }) => ({
  domain: one(domain, {
    fields: [websites.domainId],
    references: [domain.id],
  }),
  hosting: one(hosting, {
    fields: [websites.hostingId],
    references: [hosting.id],
  }),
  vps: one(vps, {
    fields: [websites.vpsId],
    references: [vps.id],
  }),
  contract: one(contracts, {
    fields: [websites.contractId],
    references: [contracts.id],
  }),
  order: one(orders, {
    fields: [websites.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [websites.customerId],
    references: [customers.id],
  }),
}))

// Export types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Domain = typeof domain.$inferSelect
export type NewDomain = typeof domain.$inferInsert
export type Hosting = typeof hosting.$inferSelect
export type NewHosting = typeof hosting.$inferInsert
export type VPS = typeof vps.$inferSelect
export type NewVPS = typeof vps.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert
export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
export type Cart = typeof cart.$inferSelect
export type NewCart = typeof cart.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type InvoiceItem = typeof invoiceItems.$inferSelect
export type NewInvoiceItem = typeof invoiceItems.$inferInsert
export type InvoiceSchedule = typeof invoiceSchedules.$inferSelect
export type NewInvoiceSchedule = typeof invoiceSchedules.$inferInsert
export type InvoicePayment = typeof invoicePayments.$inferSelect
export type NewInvoicePayment = typeof invoicePayments.$inferInsert
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
export type EmailNotification = typeof emailNotifications.$inferSelect
export type NewEmailNotification = typeof emailNotifications.$inferInsert
export type Website = typeof websites.$inferSelect
export type NewWebsite = typeof websites.$inferInsert
