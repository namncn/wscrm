import { createSuccessResponse, createCreatedResponse, createErrorResponse } from '@/lib/api-response'

// In-memory storage for domain packages (in production, use database)
let domainPackages = [
  {
    id: 'com',
    name: '.com',
    price: 250000,
    description: 'Tên miền quốc tế phổ biến nhất',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: true,
    category: 'International',
    status: 'ACTIVE'
  },
  {
    id: 'vn',
    name: '.vn',
    price: 350000,
    description: 'Tên miền Việt Nam chính thức',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: true,
    category: 'Vietnam',
    status: 'ACTIVE'
  },
  {
    id: 'net',
    name: '.net',
    price: 280000,
    description: 'Tên miền cho các tổ chức mạng',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: false,
    category: 'International',
    status: 'ACTIVE'
  },
  {
    id: 'org',
    name: '.org',
    price: 300000,
    description: 'Tên miền cho tổ chức phi lợi nhuận',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: false,
    category: 'International',
    status: 'ACTIVE'
  },
  {
    id: 'info',
    name: '.info',
    price: 200000,
    description: 'Tên miền cho website thông tin',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: false,
    category: 'International',
    status: 'ACTIVE'
  },
  {
    id: 'biz',
    name: '.biz',
    price: 320000,
    description: 'Tên miền cho doanh nghiệp',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: false,
    category: 'Business',
    status: 'ACTIVE'
  },
  {
    id: 'com.vn',
    name: '.com.vn',
    price: 400000,
    description: 'Tên miền cho doanh nghiệp',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: true,
    category: 'Vietnam',
    status: 'ACTIVE'
  },
  {
    id: 'edu.vn',
    name: '.edu.vn',
    price: 450000,
    description: 'Tên miền cho tổ chức giáo dục',
    features: ['Đăng ký 1 năm', 'DNS quản lý', 'Hỗ trợ email'],
    popular: false,
    category: 'Vietnam',
    status: 'ACTIVE'
  }
]

export async function GET() {
  try {
    return createSuccessResponse(domainPackages, 'Tải danh sách loại tên miền thành công')
  } catch (error) {
    console.error('Error fetching domain types:', error)
    return createErrorResponse('Không thể tải danh sách loại tên miền', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, price, description, features, popular, category, status } = body

    // Validate required fields
    if (!name || !price || !description || !category) {
      return createErrorResponse('Thiếu thông tin bắt buộc', 400)
    }

    // Generate unique ID
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Check if domain package already exists
    if (domainPackages.find(pkg => pkg.id === id)) {
      return createErrorResponse('Gói tên miền đã tồn tại', 400)
    }

    const newPackage = {
      id,
      name,
      price: Number(price),
      description,
      features: Array.isArray(features) ? features : features.split(',').map((f: string) => f.trim()).filter((f: string) => f),
      popular: Boolean(popular),
      category,
      status: status || 'ACTIVE'
    }

    domainPackages.push(newPackage)
    return createCreatedResponse(newPackage, 'Tạo gói tên miền thành công')
  } catch (error) {
    console.error('Error creating domain package:', error)
    return createErrorResponse('Không thể tạo gói tên miền', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, price, description, features, popular, category, status } = body

    if (!id) {
      return createErrorResponse('Thiếu ID gói tên miền', 400)
    }

    const packageIndex = domainPackages.findIndex(pkg => pkg.id === id)
    if (packageIndex === -1) {
      return createErrorResponse('Không tìm thấy gói tên miền', 404)
    }

    const updatedPackage = {
      ...domainPackages[packageIndex],
      name: name || domainPackages[packageIndex].name,
      price: price ? Number(price) : domainPackages[packageIndex].price,
      description: description || domainPackages[packageIndex].description,
      features: features ? (Array.isArray(features) ? features : features.split(',').map((f: string) => f.trim()).filter((f: string) => f)) : domainPackages[packageIndex].features,
      popular: popular !== undefined ? Boolean(popular) : domainPackages[packageIndex].popular,
      category: category || domainPackages[packageIndex].category,
      status: status || domainPackages[packageIndex].status
    }

    domainPackages[packageIndex] = updatedPackage
    return createSuccessResponse(updatedPackage, 'Cập nhật gói tên miền thành công')
  } catch (error) {
    console.error('Error updating domain package:', error)
    return createErrorResponse('Không thể cập nhật gói tên miền', 500)
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('Thiếu ID gói tên miền', 400)
    }

    const packageIndex = domainPackages.findIndex(pkg => pkg.id === id)
    if (packageIndex === -1) {
      return createErrorResponse('Không tìm thấy gói tên miền', 404)
    }

    domainPackages.splice(packageIndex, 1)
    return createSuccessResponse(null, 'Xóa gói tên miền thành công')
  } catch (error) {
    console.error('Error deleting domain package:', error)
    return createErrorResponse('Không thể xóa gói tên miền', 500)
  }
}
