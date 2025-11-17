import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const isApiRoute = pathname.startsWith('/api/')
    
    // Helper function to return error response (JSON for API routes, redirect for pages)
    const errorResponse = (message: string, status: number = 403) => {
      if (isApiRoute) {
        return NextResponse.json({ error: message }, { status })
      }
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
    
    // Helper function to return auth required response
    const authRequiredResponse = () => {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    
    // Helper function to redirect admin to dashboard (for pages only)
    const redirectAdminToDashboard = () => {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

    // Public routes - no authentication required
    const publicRoutes = new Set([
      '/',
      '/domain',
      '/hosting',
      '/vps',
      '/cart',
      '/checkout',
      '/auth/signin',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify',
      '/about',
      '/careers',
      '/news',
      '/partners',
      '/privacy-policy',
      '/terms',
      '/services',
      '/services/backup-service',
      '/services/email-hosting',
      '/support',
      '/support/ticket',
      '/support/help-center',
      '/support/faq',
      '/support/user-guide',
      '/support/contact',
    ])

    const publicRoutePrefixes = ['/support/', '/services/']

    // Customer-only routes (frontend) - require customer authentication
    const customerRoutes = [
      '/profile',
      '/orders',
      '/domain-management',
      '/hosting-management',
      '/vps-management',
      '/payments',
    ]

    // Routes accessible to both admin and customer (authenticated)
    const sharedMemberRoutes = ['/contracts', '/contract']

    // Admin-only routes (backend) - require admin/user authentication
    const adminRoutes = [
      '/admin',
      '/api/users',
      '/api/payments',
      '/api/services'
    ]
    
    // Settings API - GET is public, PUT requires admin
    const isSettingsAPI = pathname === '/api/settings'
    
    // Orders API - admin can access all, members can POST
    const isOrdersRoute = pathname.startsWith('/api/orders')
    
    // Contracts API - admin can access all, customers can GET their own contracts
    const isContractsRoute = pathname.startsWith('/api/contracts')
    const isContractDetailRoute = pathname.startsWith('/api/contract/')
    
    // Sepay payment API - allow POST and GET for authenticated customers
    const isSepayRoute = pathname.startsWith('/api/payments/sepay')
    
    // Payment by ID - allow GET for authenticated customers (to check payment status)
    const isPaymentByIdRoute = /^\/api\/payments\/[^/]+$/.test(pathname)
    
    // Webhooks - public access (no auth required)
    const isWebhookRoute = pathname.startsWith('/api/webhooks')
    
    // Product APIs - public GET, admin only for write
    const productAPIs = [
      '/api/domain',
      '/api/domain-packages',
      '/api/hosting-packages',
      '/api/vps-packages'
    ]
    
    // Member-only APIs (require authentication)
    const memberAPIs = [
      '/api/cart',
      '/api/customers',
      '/api/customers/me'
    ]
    
    // Public verification routes (no auth required)
    const verificationRoutes = [
      '/api/auth/verify',
      '/api/customers/verify'
    ]

    // Check if route is public
    const isPublicRoute =
      publicRoutes.has(pathname) ||
      publicRoutePrefixes.some((route) => pathname.startsWith(route))
    const isCustomerRoute = customerRoutes.some(route => pathname.startsWith(route))
    const isSharedMemberRoute = sharedMemberRoutes.some(route => pathname.startsWith(route))
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
    const isProductAPI = productAPIs.some(route => pathname.startsWith(route))
    const isMemberAPI = memberAPIs.some(route => pathname.startsWith(route))
    const isRegisterAPI = pathname === '/api/auth/register'
    const isVerificationRoute = verificationRoutes.some(route => pathname.startsWith(route))

    // Check user type from token
    const userType = token?.userType as string
    const userRole = token?.role as string

    // Block admin/users from accessing frontend pages (even public ones when logged in)
    // Only allow auth pages for admin to login/logout
    if (isPublicRoute && !pathname.startsWith('/auth/')) {
      // If admin/user is logged in, redirect them to admin dashboard
      if (token && userType === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
      // If customer is logged in, allow access
      if (token && userType === 'customer') {
        return NextResponse.next()
      }
      // If not logged in, allow access (public)
      if (!token) {
        return NextResponse.next()
      }
    }

    // Allow auth pages and register API for everyone
    if (pathname.startsWith('/auth/') || isRegisterAPI) {
      return NextResponse.next()
    }

    // Check specific routes FIRST before general route checks
    // Sepay route should be checked before admin routes
    if (isWebhookRoute) {
      // Webhooks are public - no authentication required
      return NextResponse.next()
    } else if (isVerificationRoute) {
      // Verification routes are public - no authentication required (users need to verify email before login)
      return NextResponse.next()
    } else if (isSettingsAPI) {
      // GET /api/settings is public (for footer display), PUT requires admin
      if (req.method === 'GET') {
        return NextResponse.next()
      } else if (req.method === 'PUT') {
        // PUT requires admin authentication
        if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
          return errorResponse('Không có quyền truy cập', 403)
        }
        return NextResponse.next()
      }
      // Other methods not allowed
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    } else if (isSepayRoute) {
      // Allow POST (create Sepay payment) and GET (retrieve QR) for customers
      if (req.method === 'POST' || req.method === 'GET') {
        if (!token || userType !== 'customer') {
          if (token && userType === 'admin') {
            return redirectAdminToDashboard()
          }
          return authRequiredResponse()
        }
      }
      return NextResponse.next()
    } else if (isPaymentByIdRoute) {
      // Allow GET for authenticated customers (to check payment status)
      if (req.method === 'GET') {
        if (!token) {
          return authRequiredResponse()
        }
        // Allow both admin and customer to check payment status
        return NextResponse.next()
      }
      // Other methods require admin
      if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
        return errorResponse('Không có quyền truy cập', 403)
      }
      return NextResponse.next()
    } else if (isOrdersRoute) {
      // Handle orders route separately
      if (req.method === 'GET') {
        // GET allowed for both admin (to view all orders in admin panel) and customers (to view their own)
        if (!token) {
          return authRequiredResponse()
        }
        // Both admin and customer can access GET
      } else if (req.method === 'POST') {
        // POST (create order) - allowed for both admin (from admin panel) and customers (from checkout)
        if (!token) {
          return authRequiredResponse()
        }
        // Both admin and customer can POST orders
        // Admin can create orders for customers in admin panel
        // Customers create orders for themselves in checkout
      } else {
        // PUT/DELETE/PATCH require admin role
        if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
          return errorResponse('Không có quyền truy cập', 403)
        }
      }
      return NextResponse.next()
    } else if (isContractDetailRoute) {
      // Detail routes (including PDF/send-email) for a specific contract
      if (req.method === 'GET') {
        if (!token) {
          return authRequiredResponse()
        }
        return NextResponse.next()
      }
      if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
        return errorResponse('Không có quyền truy cập', 403)
      }
      return NextResponse.next()
    } else if (isContractsRoute) {
      // Handle contracts list/management route
      if (req.method === 'GET') {
        if (!token) {
          return authRequiredResponse()
        }
        return NextResponse.next()
      }
      if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
        return errorResponse('Không có quyền truy cập', 403)
      }
      return NextResponse.next()
    }
    
    // Admin routes - only allow admin users (userType: 'admin')
    else if (isAdminRoute) {
      // /api/users/me - allow for both admin and authenticated users (to get their own info)
      if (pathname === '/api/users/me') {
        if (!token) {
          return NextResponse.redirect(new URL('/auth/signin', req.url))
        }
        // Allow access for any authenticated user (admin or customer)
        return NextResponse.next()
      }
      
      // /admin/users - Allow both ADMIN and USER to view
      if (pathname === '/admin/users') {
        if (!token || userType !== 'admin') {
          return errorResponse('Không có quyền truy cập', 403)
        }
        // Allow both ADMIN and USER roles
        if (userRole !== 'ADMIN' && userRole !== 'USER') {
          return errorResponse('Không có quyền truy cập', 403)
        }
        return NextResponse.next()
      }
      
      // /api/users - check by HTTP method
      if (pathname === '/api/users') {
        // GET method: allow both ADMIN and USER (to view members list)
        if (req.method === 'GET') {
          if (!token || userType !== 'admin') {
            return errorResponse('Không có quyền truy cập', 403)
          }
          // Allow both ADMIN and USER to view (permission check in API route)
          if (userRole !== 'ADMIN' && userRole !== 'USER') {
            return errorResponse('Không có quyền truy cập', 403)
          }
          return NextResponse.next()
        }
        // PUT method: allow both ADMIN and USER (for updating own profile)
        else if (req.method === 'PUT') {
          if (!token || userType !== 'admin') {
            return errorResponse('Không có quyền truy cập', 403)
          }
          // Allow ADMIN and USER to update (permission check in API route)
          return NextResponse.next()
        } else {
          // POST, PUT, DELETE, PATCH: only ADMIN
          if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
            return errorResponse('Không có quyền truy cập', 403)
          }
          return NextResponse.next()
        }
      }
      
      if (!token || userType !== 'admin') {
        return errorResponse('Không có quyền truy cập', 403)
      }
      // Additional check for admin role if needed
      if (userRole !== 'ADMIN' && userRole !== 'USER') {
        return errorResponse('Không có quyền truy cập', 403)
      }
    }
    // Customer routes - ONLY allow customers (block admin/users)
    else if (isSharedMemberRoute) {
      if (!token) {
        return authRequiredResponse()
      }
      // Allow both admin and customer (other roles blocked)
      if (userType !== 'customer' && userType !== 'admin') {
        return errorResponse('Không có quyền truy cập', 403)
      }
      return NextResponse.next()
    }
    // Customer routes - ONLY allow customers (block admin/users)
    else if (isCustomerRoute) {
      if (!token || userType !== 'customer') {
        // If admin tries to access, redirect to admin dashboard
        if (token && userType === 'admin') {
          return redirectAdminToDashboard()
        }
        return authRequiredResponse()
      }
      return NextResponse.next()
    } else if (isProductAPI) {
      // For product APIs, allow GET requests for everyone (public), block write operations for non-admin
      if (req.method !== 'GET') {
        if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
          return errorResponse('Không có quyền truy cập', 403)
        }
      }
      // GET requests are public - no authentication required
    } else if (isMemberAPI) {
      // /api/customers/me - ONLY for customers
      if (pathname === '/api/customers/me') {
        if (!token || userType !== 'customer') {
          if (token && userType === 'admin') {
            return redirectAdminToDashboard()
          }
          return authRequiredResponse()
        }
      }
      // /api/cart - ONLY for customers
      else if (pathname === '/api/cart') {
        if (!token || userType !== 'customer') {
          if (token && userType === 'admin') {
            return redirectAdminToDashboard()
          }
          return authRequiredResponse()
        }
      }
      // /api/customers - GET allowed for both admin and customers, write operations handled separately
      // Skip verification route as it's handled above
      else if (pathname.startsWith('/api/customers') && !isVerificationRoute) {
        if (req.method === 'GET') {
          // GET allowed for both admin (to view list in admin panel) and customers (to view their own)
          if (!token) {
            return authRequiredResponse()
          }
          // Both admin and customer can access GET
        } else if (req.method === 'PUT') {
          // PUT allowed for both admin (to update any customer) and customers (to update their own - checked in API)
          if (!token) {
            return authRequiredResponse()
          }
          // Both admin and customer can access PUT (permission check in API route)
        } else {
          // POST, DELETE, PATCH require admin
          if (!token || userType !== 'admin' || userRole !== 'ADMIN') {
            return errorResponse('Không có quyền truy cập', 403)
          }
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
      // Public routes don't require token
      const publicRoutes = new Set([
        '/',
        '/domain',
        '/hosting',
        '/vps',
        '/cart',
        '/checkout',
        '/auth/signin',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/verify',
        '/about',
        '/careers',
        '/news',
        '/partners',
        '/privacy-policy',
        '/terms',
        '/services',
        '/services/backup-service',
        '/services/email-hosting',
        '/support',
        '/support/ticket',
        '/support/help-center',
        '/support/faq',
        '/support/user-guide',
        '/support/contact',
      ])
        const publicRoutePrefixes = ['/support/', '/services/']
        const isPublicRoute =
          publicRoutes.has(pathname) ||
          publicRoutePrefixes.some((route) => pathname.startsWith(route))
        const isRegisterAPI = pathname === '/api/auth/register'
        
        // Product APIs GET requests are public
        const productAPIs = ['/api/domain', '/api/domain-packages', '/api/hosting-packages', '/api/vps-packages']
        const isProductAPI = productAPIs.some(route => pathname.startsWith(route))
        const isProductGET = isProductAPI && req.method === 'GET'
        
        // Webhook routes are public
        const isWebhookRoute = pathname.startsWith('/api/webhooks')
        
        // Verification routes are public (users need to verify before login)
        const verificationRoutes = ['/api/auth/verify', '/api/customers/verify']
        const isVerificationRoute = verificationRoutes.some(route => pathname.startsWith(route))
        
        // Settings API GET is public
        const isSettingsAPI = pathname === '/api/settings'
        const isSettingsGET = isSettingsAPI && req.method === 'GET'
        
        if (isPublicRoute || isRegisterAPI || isProductGET || isWebhookRoute || isVerificationRoute || isSettingsGET) {
          return true // Allow access without token
        }
        
        return !!token // Require token for other routes
      }
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|api/webhooks|auth|_next/static|_next/image|favicon.ico|unauthorized).*)',
  ]
}
