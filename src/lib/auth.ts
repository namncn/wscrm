import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { Database } from './database'

export const authOptions: NextAuthOptions = {
  providers: [
    // Admin/User authentication (for /admin routes)
    CredentialsProvider({
      id: 'admin',
      name: 'admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await Database.queryOne(
            'SELECT * FROM users WHERE email = ?',
            [credentials.email]
          )

          if (!user) {
            return null
          }

          const isPasswordValid = await compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            userType: 'admin'
          }
        } catch (error) {
          console.error('Admin auth error:', error)
          return null
        }
      }
    }),
    // Customer authentication (for frontend routes)
    CredentialsProvider({
      id: 'customer',
      name: 'customer',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find customer by email and verify password from customers table
          const customer = await Database.queryOne(
            'SELECT * FROM customers WHERE email = ?',
            [credentials.email]
          )

          if (!customer) {
            return null
          }

          const isPasswordValid = await compare(credentials.password, customer.password)

          if (!isPasswordValid) {
            return null
          }

          // Check if email is verified
          // emailVerified can be 'YES', 'NO', or might not exist (default to 'NO')
          const emailVerified = customer.emailVerified || 'NO'
          if (emailVerified !== 'YES') {
            // Throw error to prevent login, NextAuth will handle this
            throw new Error('EMAIL_NOT_VERIFIED')
          }

          return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            role: 'CUSTOMER',
            userType: 'customer',
            customerId: customer.id,
            userId: customer.userId
          }
        } catch (error: any) {
          // Re-throw email verification error
          if (error?.message === 'EMAIL_NOT_VERIFIED') {
            throw error
          }
          console.error('Customer auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // For customer login, email verification is checked in authorize function
      // This callback is called after authorize, so if we reach here, user is authenticated
      return true
    },
    async jwt({ token, user, trigger }) {
      // On sign in, add user data to token
      if (user && 'role' in user) {
        token.role = (user as any).role
        token.id = (user as any).id
        token.userType = (user as any).userType
        token.customerId = (user as any).customerId
        token.userId = (user as any).userId
        token.email = (user as any).email
        token.name = (user as any).name
      }
      
      // Fetch fresh user data from database when:
      // 1. Trigger is 'update' (after profile update)
      // 2. Or when token already exists (on page reload/refresh) - ensures fresh data
      // This ensures session always has latest data from database
      if (token.userType === 'admin' && (trigger === 'update' || !user)) {
        try {
          // Try to find user by ID first (more reliable, especially when email was changed)
          let userData = null
          if (token.id) {
            userData = await Database.queryOne(
              'SELECT id, name, email, role FROM users WHERE id = ?',
              [token.id]
            )
          }
          // Fallback to email if ID not found
          if (!userData && token.email) {
            userData = await Database.queryOne(
              'SELECT id, name, email, role FROM users WHERE email = ?',
              [token.email]
            )
          }
          if (userData) {
            // Update token with fresh data from database
            token.name = userData.name
            token.email = userData.email
            token.role = userData.role
            token.id = userData.id
          }
        } catch (error) {
          console.error('Error fetching updated user data:', error)
          // Don't throw - use cached token data if database fetch fails
        }
      }
      
      // Handle customer refresh as well
      if (token.userType === 'customer' && (trigger === 'update' || !user)) {
        try {
          // Try to find customer by ID first (more reliable, especially when email was changed)
          let customerData = null
          if (token.id) {
            customerData = await Database.queryOne(
              'SELECT id, name, email FROM customers WHERE id = ?',
              [token.id]
            )
          }
          // Fallback to email if ID not found
          if (!customerData && token.email) {
            customerData = await Database.queryOne(
              'SELECT id, name, email FROM customers WHERE email = ?',
              [token.email]
            )
          }
          if (customerData) {
            token.name = customerData.name
            token.email = customerData.email
            token.id = customerData.id
          }
        } catch (error) {
          console.error('Error fetching updated customer data:', error)
          // Don't throw - use cached token data if database fetch fails
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user && token.sub) {
        (session.user as any).id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).userType = token.userType as string
        ;(session.user as any).customerId = token.customerId as string
        ;(session.user as any).userId = token.userId as string
        // Update name and email from token (ensure we use the latest values)
        if (token.name) {
          session.user.name = token.name as string
        }
        if (token.email) {
          session.user.email = token.email as string
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
}
