import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/database'
import { hostingPackages, domainPackages, vpsPackages, cart, customers } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('product_id')
    const serviceType = searchParams.get('service_type') || 'HOSTING'

    if (!productId) {
      return NextResponse.redirect(new URL('/hosting?error=missing_product_id', req.url))
    }

    const session = await getServerSession(authOptions)

    // Get product details from database
    let productName = ''
    let price = 0
    const productIdNum = parseInt(productId, 10)

    if (isNaN(productIdNum)) {
      return NextResponse.redirect(new URL('/hosting?error=invalid_product_id', req.url))
    }

    if (serviceType === 'HOSTING') {
      const products = await db
        .select()
        .from(hostingPackages)
        .where(eq(hostingPackages.id, productIdNum))
        .limit(1)
      
      if (products.length > 0) {
        productName = products[0].planName
        price = parseFloat(products[0].price.toString()) || 0
      }
    } else if (serviceType === 'DOMAIN') {
      const products = await db
        .select()
        .from(domainPackages)
        .where(eq(domainPackages.id, productIdNum))
        .limit(1)
      
      if (products.length > 0) {
        productName = products[0].name
        price = parseFloat(products[0].price.toString()) || 0
      }
    } else if (serviceType === 'VPS') {
      const products = await db
        .select()
        .from(vpsPackages)
        .where(eq(vpsPackages.id, productIdNum))
        .limit(1)
      
      if (products.length > 0) {
        productName = products[0].planName
        price = parseFloat(products[0].price.toString()) || 0
      }
    }

    if (!productName) {
      return NextResponse.redirect(new URL(`/${serviceType.toLowerCase()}?error=product_not_found`, req.url))
    }

    // If user is logged in, add to database cart
    if (session?.user) {
      const userType = (session.user as any)?.userType
      if (userType === 'customer' && session.user.email) {
        // Find customer by email
        const customer = await db
          .select({ id: customers.id, userId: customers.userId })
          .from(customers)
          .where(eq(customers.email, session.user.email))
          .limit(1)

        if (customer.length > 0) {
          const userId = customer[0].userId || customer[0].id

          // For HOSTING/VPS, serviceId is a number
          const serviceIdNum = parseInt(productId, 10)
          if (isNaN(serviceIdNum) && serviceType !== 'DOMAIN') {
            return NextResponse.redirect(new URL('/hosting?error=invalid_product_id', req.url))
          }

          // Check if item already exists in cart
          const existingItems = await db
            .select()
            .from(cart)
            .where(
              and(
                eq(cart.userId, userId),
                eq(cart.serviceId, serviceType === 'DOMAIN' ? 0 : serviceIdNum),
                eq(cart.serviceType, serviceType)
              )
            )
            .limit(1)

          if (existingItems.length > 0) {
            // Update quantity
            await db
              .update(cart)
              .set({
                quantity: existingItems[0].quantity + 1,
                updatedAt: new Date()
              })
              .where(eq(cart.id, existingItems[0].id))
          } else {
            // Add new item
            const cartData: any = {
              userId: userId,
              serviceId: serviceType === 'DOMAIN' ? 0 : serviceIdNum,
              serviceType: serviceType,
              serviceName: productName,
              quantity: 1,
              price: price.toString(),
              createdAt: new Date(),
              updatedAt: new Date()
            }

            // For DOMAIN, store domainTypeId in serviceData
            if (serviceType === 'DOMAIN') {
              cartData.serviceData = JSON.stringify({
                domainTypeId: productId
              })
            }

            await db.insert(cart).values(cartData)
          }

          return NextResponse.redirect(new URL('/cart?added=1', req.url))
        }
      }
    }

    // If not logged in, redirect to hosting page with product info in query
    // Frontend will handle adding to localStorage
    return NextResponse.redirect(new URL(`/${serviceType.toLowerCase()}?add_to_cart=${productId}&auto_add=1`, req.url))
  } catch (error) {
    console.error('Error in add to cart API:', error)
    return NextResponse.redirect(new URL('/hosting?error=add_to_cart_failed', req.url))
  }
}

