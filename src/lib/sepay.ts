// Sepay VietQR Integration
// Based on SePay WordPress Plugin
// QR Generator: https://qr.sepay.vn
// API: https://my.sepay.vn

interface BankInfo {
  bankName: string
  bankShortName: string
  bankBin: string
  accountNumber: string
  accountHolderName: string
}

interface QRCodeData {
  qrCodeUrl: string
  bankInfo: BankInfo
  remark: string
  amount: number
}

class SepayQR {
  /**
   * Generate remark (payment code) for the order
   * Format: {payCodePrefix}{orderId}
   * Special handling for VietinBank and ABBANK: add "SEVQR " prefix
   */
  generateRemark(orderId: string, payCodePrefix: string = 'DH', bankBin?: string): string {
    const remark = `${payCodePrefix}${orderId}`

    // VietinBank (970415) and ABBANK (970425) require "SEVQR " prefix
    if (bankBin && ['970415', '970425'].includes(bankBin)) {
      return `SEVQR ${remark}`
    }

    return remark
  }

  /**
   * Generate VietQR code URL
   * URL format: https://qr.sepay.vn/img?acc={account}&bank={bin}&amount={amount}&des={remark}&template=compact
   */
  generateQRCodeUrl(
    accountNumber: string,
    bankBin: string,
    amount: number,
    remark: string,
    template: string = 'compact'
  ): string {
    return `https://qr.sepay.vn/img?acc=${encodeURIComponent(accountNumber)}&bank=${encodeURIComponent(bankBin)}&amount=${amount}&des=${encodeURIComponent(remark)}&template=${template}`
  }

  /**
   * Create QR code data for payment
   */
  createQRCode(
    orderId: string,
    amount: number,
    bankInfo: BankInfo,
    payCodePrefix: string = 'DH'
  ): QRCodeData {
    const remark = this.generateRemark(orderId, payCodePrefix, bankInfo.bankBin)
    const qrCodeUrl = this.generateQRCodeUrl(
      bankInfo.accountNumber,
      bankInfo.bankBin,
      amount,
      remark
    )

    return {
      qrCodeUrl,
      bankInfo,
      remark,
      amount
    }
  }

  /**
   * Verify webhook signature (placeholder for future enhancement)
   */
  verifyWebhook(): boolean {
    // TODO: Implement webhook verification if needed
    return true
  }

  /**
   * Extract order ID from payment code
   * Remove prefix to get the order ID
   */
  extractOrderIdFromCode(code: string, payCodePrefix: string = 'DH'): string | null {
    // Remove "SEVQR " prefix if present (for VietinBank/ABBANK)
    const cleanCode = code.startsWith('SEVQR ') ? code.substring(6) : code
    
    if (!cleanCode.startsWith(payCodePrefix)) {
      console.error('[SepayQR] Invalid payment code format:', code)
      return null
    }
    
    const orderId = cleanCode.substring(payCodePrefix.length)
    return orderId
  }
}

// Export singleton instance
const sepay = new SepayQR()
export default sepay

