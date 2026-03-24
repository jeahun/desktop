/**
 * 결제 솔루션 메인 엔트리포인트
 * Payment Solution Main Entry Point
 *
 * 이니시스(Inicis)와 유사한 PG(Payment Gateway) 솔루션
 *
 * 사용 예시:
 * ```typescript
 * import { createPaymentGateway, PaymentMethod, Currency } from './payment'
 *
 * const gateway = createPaymentGateway({
 *   merchantId: 'MERCHANT_001',
 *   secretKey: 'your-secret-key-32chars',
 *   encryptKey: 'your-encrypt-key',
 *   testMode: true,
 *   allowedMethods: [PaymentMethod.CARD, PaymentMethod.KAKAO_PAY],
 * })
 *
 * const payment = await gateway.initializePayment({
 *   orderId: 'ORDER_20240101_001',
 *   orderName: '상품 구매',
 *   amount: 10000,
 *   currency: Currency.KRW,
 *   method: PaymentMethod.CARD,
 *   buyerName: '홍길동',
 *   buyerEmail: 'buyer@example.com',
 *   returnUrl: 'https://shop.example.com/payment/result',
 * })
 * ```
 */

export { PaymentGateway, createPaymentGateway } from './payment-gateway'
export { PaymentApiRouter, createPaymentApiRouter } from './api/payment-api'
export {
  encrypt,
  decrypt,
  generateHmacSignature,
  verifyHmacSignature,
  maskCardNumber,
  maskAccountNumber,
  generatePaymentId,
  generateSecureToken,
} from './security/encryption'
export * from './types'
