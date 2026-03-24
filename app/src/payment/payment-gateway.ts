/**
 * 결제 게이트웨이 핵심 모듈
 * Payment Gateway Core Module
 *
 * 이니시스와 유사한 PG(Payment Gateway) 시스템
 */

import {
  PaymentRequest,
  PaymentResponse,
  PaymentStatus,
  PaymentMethod,
  CancelRequest,
  CancelResponse,
  WebhookPayload,
  MerchantConfig,
  Transaction,
  Currency,
} from './types'
import {
  generatePaymentId,
  generateSecureToken,
  generateHmacSignature,
  generateChecksum,
  maskCardNumber,
  maskAccountNumber,
} from './security/encryption'

// 인메모리 거래 저장소 (실제 환경에서는 DB 사용)
const paymentStore = new Map<string, PaymentResponse>()
const transactionStore = new Map<string, Transaction[]>()

export class PaymentGateway {
  private config: MerchantConfig

  constructor(config: MerchantConfig) {
    this.validateConfig(config)
    this.config = config
  }

  /**
   * 결제 요청 초기화
   * 결제창 URL 또는 결제 준비 정보를 반환
   */
  async initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.validatePaymentRequest(request)
    this.checkMethodAllowed(request.method)

    const paymentId = generatePaymentId()
    const now = new Date()

    // 결제창 URL 생성 (실제로는 PG사 서버로 리다이렉트)
    const checkoutUrl = this.generateCheckoutUrl(paymentId, request)

    const payment: PaymentResponse = {
      paymentId,
      orderId: request.orderId,
      status: PaymentStatus.READY,
      method: request.method,
      amount: request.amount,
      currency: request.currency,
      checkoutUrl,
      createdAt: now,
      updatedAt: now,
    }

    // 가상계좌는 즉시 계좌 발급
    if (request.method === PaymentMethod.VIRTUAL_ACCOUNT) {
      payment.virtualAccount = await this.issueVirtualAccount(request)
      payment.status = PaymentStatus.PENDING
    }

    paymentStore.set(paymentId, payment)
    this.recordTransaction(paymentId, request.orderId, 'PAYMENT', request.amount, PaymentStatus.READY, request.method)

    console.log(`[PaymentGateway] 결제 초기화 - ID: ${paymentId}, 주문: ${request.orderId}, 금액: ${request.amount}원`)

    return payment
  }

  /**
   * 결제 승인 처리
   * 결제창에서 사용자가 결제 완료 후 호출
   */
  async approvePayment(
    paymentId: string,
    approvalData: Record<string, string>
  ): Promise<PaymentResponse> {
    const payment = this.getPaymentOrThrow(paymentId)

    if (payment.status !== PaymentStatus.READY && payment.status !== PaymentStatus.PENDING) {
      throw new Error(`결제를 승인할 수 없는 상태입니다: ${payment.status}`)
    }

    // 결제 검증
    this.verifyPaymentIntegrity(payment, approvalData)

    const now = new Date()

    // 결제 방법별 처리
    switch (payment.method) {
      case PaymentMethod.CARD:
        payment.card = this.processCardApproval(approvalData)
        payment.receiptUrl = `https://receipt.example.com/${paymentId}`
        break

      case PaymentMethod.KAKAO_PAY:
      case PaymentMethod.NAVER_PAY:
      case PaymentMethod.TOSS_PAY:
        payment.easyPay = {
          provider: payment.method as 'KAKAO_PAY' | 'NAVER_PAY' | 'TOSS_PAY',
        }
        payment.receiptUrl = `https://receipt.example.com/${paymentId}`
        break

      case PaymentMethod.BANK_TRANSFER:
        payment.bankTransfer = {
          bankCode: approvalData.bankCode || '004',
          bankName: approvalData.bankName || '국민은행',
          accountNumber: maskAccountNumber(approvalData.accountNumber || '1234567890'),
        }
        break

      case PaymentMethod.VIRTUAL_ACCOUNT:
        // 입금 확인 (웹훅으로 처리됨)
        break
    }

    payment.status = PaymentStatus.COMPLETED
    payment.paidAt = now
    payment.updatedAt = now

    paymentStore.set(paymentId, payment)
    this.updateTransactionStatus(paymentId, PaymentStatus.COMPLETED)

    console.log(`[PaymentGateway] 결제 승인 완료 - ID: ${paymentId}, 금액: ${payment.amount}원`)

    return payment
  }

  /**
   * 결제 취소/환불 처리
   */
  async cancelPayment(request: CancelRequest): Promise<CancelResponse> {
    const payment = this.getPaymentOrThrow(request.paymentId)

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error(`취소할 수 없는 결제 상태입니다: ${payment.status}`)
    }

    const cancelAmount = request.cancelAmount ?? payment.amount
    if (cancelAmount <= 0 || cancelAmount > payment.amount) {
      throw new Error(`유효하지 않은 취소 금액입니다: ${cancelAmount}`)
    }

    const isPartial = cancelAmount < payment.amount
    const now = new Date()
    const cancelId = `CANCEL_${generateSecureToken(8).toUpperCase()}`

    // 가상계좌 환불 시 계좌 정보 필수
    if (payment.method === PaymentMethod.VIRTUAL_ACCOUNT && isPartial) {
      if (!request.refundAccountNumber || !request.refundBankCode) {
        throw new Error('가상계좌 환불 시 환불 계좌 정보가 필요합니다')
      }
    }

    payment.status = isPartial ? PaymentStatus.PARTIAL_REFUNDED : PaymentStatus.REFUNDED
    payment.updatedAt = now
    paymentStore.set(request.paymentId, payment)

    this.recordTransaction(
      request.paymentId,
      payment.orderId,
      'CANCEL',
      cancelAmount,
      payment.status,
      payment.method
    )

    console.log(`[PaymentGateway] 결제 취소 - ID: ${request.paymentId}, 취소금액: ${cancelAmount}원, 사유: ${request.cancelReason}`)

    return {
      cancelId,
      paymentId: request.paymentId,
      status: payment.status,
      cancelAmount,
      cancelReason: request.cancelReason,
      cancelledAt: now,
    }
  }

  /**
   * 결제 조회
   */
  getPayment(paymentId: string): PaymentResponse | undefined {
    return paymentStore.get(paymentId)
  }

  /**
   * 주문 ID로 결제 조회
   */
  getPaymentByOrderId(orderId: string): PaymentResponse | undefined {
    for (const payment of paymentStore.values()) {
      if (payment.orderId === orderId) {
        return payment
      }
    }
    return undefined
  }

  /**
   * 거래 내역 조회
   */
  getTransactions(paymentId: string): Transaction[] {
    return transactionStore.get(paymentId) ?? []
  }

  /**
   * 웹훅 서명 생성
   */
  generateWebhookSignature(payload: Omit<WebhookPayload, 'signature'>): string {
    const data = JSON.stringify({
      paymentId: payload.paymentId,
      orderId: payload.orderId,
      status: payload.status,
      amount: payload.amount,
      timestamp: payload.timestamp,
    })
    return generateHmacSignature(data, this.config.webhookSecret ?? this.config.secretKey)
  }

  /**
   * 웹훅 서명 검증 (가맹점 서버에서 사용)
   */
  verifyWebhookSignature(payload: WebhookPayload): boolean {
    const { signature, ...rest } = payload
    const expectedSignature = this.generateWebhookSignature(rest)
    return signature === expectedSignature
  }

  /**
   * 결제 URL 서명 검증
   */
  verifyChecksum(
    orderId: string,
    amount: number,
    checksum: string
  ): boolean {
    const expected = generateChecksum(orderId, amount, this.config.merchantId, this.config.secretKey)
    return expected === checksum
  }

  // ─── Private Methods ──────────────────────────────────────────────

  private validateConfig(config: MerchantConfig): void {
    if (!config.merchantId) throw new Error('merchantId가 필요합니다')
    if (!config.secretKey) throw new Error('secretKey가 필요합니다')
    if (!config.encryptKey) throw new Error('encryptKey가 필요합니다')
    if (config.secretKey.length < 16) throw new Error('secretKey는 최소 16자 이상이어야 합니다')
    if (!config.allowedMethods || config.allowedMethods.length === 0) {
      throw new Error('허용된 결제 방법을 최소 1개 이상 설정해야 합니다')
    }
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.orderId) throw new Error('orderId가 필요합니다')
    if (!request.orderName) throw new Error('orderName이 필요합니다')
    if (!request.amount || request.amount <= 0) throw new Error('유효한 결제 금액이 필요합니다')
    if (request.amount < 100) throw new Error('최소 결제 금액은 100원입니다')
    if (!request.buyerName) throw new Error('구매자명이 필요합니다')
    if (!request.buyerEmail) throw new Error('구매자 이메일이 필요합니다')
    if (!request.returnUrl) throw new Error('returnUrl이 필요합니다')

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(request.buyerEmail)) {
      throw new Error('유효하지 않은 이메일 형식입니다')
    }

    // 중복 주문 ID 확인
    const existing = this.getPaymentByOrderId(request.orderId)
    if (existing && existing.status !== PaymentStatus.FAILED) {
      throw new Error(`이미 존재하는 주문 ID입니다: ${request.orderId}`)
    }
  }

  private checkMethodAllowed(method: PaymentMethod): void {
    if (!this.config.allowedMethods.includes(method)) {
      throw new Error(`허용되지 않은 결제 방법입니다: ${method}`)
    }
  }

  private generateCheckoutUrl(paymentId: string, request: PaymentRequest): string {
    const base = this.config.testMode
      ? 'https://testpay.example.com/checkout'
      : 'https://pay.example.com/checkout'

    const checksum = generateChecksum(
      request.orderId,
      request.amount,
      this.config.merchantId,
      this.config.secretKey
    )

    const params = new URLSearchParams({
      paymentId,
      merchantId: this.config.merchantId,
      orderId: request.orderId,
      amount: String(request.amount),
      method: request.method,
      checksum,
    })

    return `${base}?${params.toString()}`
  }

  private async issueVirtualAccount(
    request: PaymentRequest
  ): Promise<PaymentResponse['virtualAccount']> {
    // 실제 환경에서는 은행 API 호출
    const banks = [
      { code: '004', name: '국민은행' },
      { code: '088', name: '신한은행' },
      { code: '020', name: '우리은행' },
      { code: '081', name: 'KEB하나은행' },
    ]
    const bank = banks[Math.floor(Math.random() * banks.length)]
    const accountNumber = `${Math.floor(Math.random() * 9000000000) + 1000000000}`

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3) // 3일 후 만료

    return {
      bankCode: bank.code,
      bankName: bank.name,
      accountNumber,
      accountHolder: '(주)결제솔루션',
      expiresAt,
    }
  }

  private processCardApproval(approvalData: Record<string, string>) {
    const cardNumber = approvalData.cardNumber ?? '411111111111'
    return {
      cardNumber: maskCardNumber(cardNumber),
      cardCompany: approvalData.cardCompany ?? '삼성카드',
      cardType: (approvalData.cardType as 'CREDIT' | 'DEBIT' | 'PREPAID') ?? 'CREDIT',
      installmentMonths: parseInt(approvalData.installmentMonths ?? '0', 10),
      approvalNumber: generateSecureToken(6).toUpperCase(),
    }
  }

  private verifyPaymentIntegrity(
    payment: PaymentResponse,
    approvalData: Record<string, string>
  ): void {
    // 금액 변조 감지
    if (approvalData.amount && parseInt(approvalData.amount, 10) !== payment.amount) {
      throw new Error('결제 금액이 변조되었습니다')
    }
    // 주문 ID 검증
    if (approvalData.orderId && approvalData.orderId !== payment.orderId) {
      throw new Error('주문 ID가 일치하지 않습니다')
    }
  }

  private getPaymentOrThrow(paymentId: string): PaymentResponse {
    const payment = paymentStore.get(paymentId)
    if (!payment) {
      throw new Error(`존재하지 않는 결제 ID입니다: ${paymentId}`)
    }
    return payment
  }

  private recordTransaction(
    paymentId: string,
    orderId: string,
    type: Transaction['type'],
    amount: number,
    status: PaymentStatus,
    method: PaymentMethod
  ): void {
    const transaction: Transaction = {
      transactionId: `TXN_${generateSecureToken(8).toUpperCase()}`,
      paymentId,
      orderId,
      type,
      amount,
      status,
      method,
      createdAt: new Date(),
    }

    const existing = transactionStore.get(paymentId) ?? []
    existing.push(transaction)
    transactionStore.set(paymentId, existing)
  }

  private updateTransactionStatus(paymentId: string, status: PaymentStatus): void {
    const transactions = transactionStore.get(paymentId) ?? []
    if (transactions.length > 0) {
      transactions[transactions.length - 1].status = status
      transactionStore.set(paymentId, transactions)
    }
  }
}

/**
 * 가맹점별 PaymentGateway 인스턴스 생성 헬퍼
 */
export function createPaymentGateway(config: MerchantConfig): PaymentGateway {
  return new PaymentGateway(config)
}
