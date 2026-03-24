/**
 * 결제 솔루션 타입 정의
 * Payment Solution Type Definitions
 */

// 결제 방법
export enum PaymentMethod {
  CARD = 'CARD',                    // 신용/체크카드
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT', // 가상계좌
  BANK_TRANSFER = 'BANK_TRANSFER',  // 계좌이체
  KAKAO_PAY = 'KAKAO_PAY',         // 카카오페이
  NAVER_PAY = 'NAVER_PAY',         // 네이버페이
  TOSS_PAY = 'TOSS_PAY',           // 토스페이
}

// 결제 상태
export enum PaymentStatus {
  READY = 'READY',               // 결제 준비
  PENDING = 'PENDING',           // 결제 진행 중
  COMPLETED = 'COMPLETED',       // 결제 완료
  FAILED = 'FAILED',             // 결제 실패
  CANCELLED = 'CANCELLED',       // 결제 취소
  REFUNDED = 'REFUNDED',         // 환불 완료
  PARTIAL_REFUNDED = 'PARTIAL_REFUNDED', // 부분 환불
}

// 화폐 단위
export enum Currency {
  KRW = 'KRW',
  USD = 'USD',
  JPY = 'JPY',
}

// 카드 정보
export interface CardInfo {
  cardNumber: string          // 카드번호 (마스킹 처리)
  cardCompany: string         // 카드사 (삼성, 현대, KB 등)
  cardType: 'CREDIT' | 'DEBIT' | 'PREPAID'
  installmentMonths: number   // 할부 개월 (0=일시불)
  approvalNumber?: string     // 승인번호
}

// 가상계좌 정보
export interface VirtualAccountInfo {
  bankCode: string            // 은행 코드
  bankName: string            // 은행명
  accountNumber: string       // 가상계좌번호
  accountHolder: string       // 예금주
  expiresAt: Date             // 입금 기한
}

// 계좌이체 정보
export interface BankTransferInfo {
  bankCode: string
  bankName: string
  accountNumber: string       // 마스킹 처리
}

// 간편결제 정보
export interface EasyPayInfo {
  provider: 'KAKAO_PAY' | 'NAVER_PAY' | 'TOSS_PAY'
  billingKey?: string         // 정기결제용 빌링키
}

// 결제 요청
export interface PaymentRequest {
  orderId: string             // 주문 ID (가맹점 생성)
  orderName: string           // 주문명
  amount: number              // 결제 금액
  currency: Currency
  method: PaymentMethod
  buyerName: string           // 구매자명
  buyerEmail: string          // 구매자 이메일
  buyerPhone?: string         // 구매자 전화번호
  returnUrl: string           // 결제 완료 후 리다이렉트 URL
  webhookUrl?: string         // 웹훅 URL
  metadata?: Record<string, string> // 추가 데이터
  expiresAt?: Date            // 결제 만료 시간
}

// 결제 응답
export interface PaymentResponse {
  paymentId: string           // 결제 고유 ID (시스템 생성)
  orderId: string
  status: PaymentStatus
  method: PaymentMethod
  amount: number
  currency: Currency
  paidAt?: Date
  failReason?: string
  card?: CardInfo
  virtualAccount?: VirtualAccountInfo
  bankTransfer?: BankTransferInfo
  easyPay?: EasyPayInfo
  receiptUrl?: string         // 영수증 URL
  checkoutUrl?: string        // 결제창 URL (READY 상태)
  createdAt: Date
  updatedAt: Date
}

// 결제 취소/환불 요청
export interface CancelRequest {
  paymentId: string
  cancelReason: string
  cancelAmount?: number       // 부분 취소 금액 (없으면 전액)
  refundBankCode?: string     // 환불 은행 코드 (가상계좌 환불 시)
  refundAccountNumber?: string // 환불 계좌번호
  refundAccountHolder?: string // 환불 예금주
}

// 결제 취소 응답
export interface CancelResponse {
  cancelId: string
  paymentId: string
  status: PaymentStatus
  cancelAmount: number
  cancelReason: string
  cancelledAt: Date
}

// 웹훅 페이로드
export interface WebhookPayload {
  paymentId: string
  orderId: string
  status: PaymentStatus
  amount: number
  method: PaymentMethod
  timestamp: Date
  signature: string           // HMAC-SHA256 서명
}

// 가맹점 설정
export interface MerchantConfig {
  merchantId: string          // 가맹점 ID
  secretKey: string           // 시크릿 키
  encryptKey: string          // 암호화 키 (AES-256)
  webhookSecret?: string      // 웹훅 시크릿
  testMode: boolean           // 테스트 모드
  allowedMethods: PaymentMethod[]
}

// 거래 내역
export interface Transaction {
  transactionId: string
  paymentId: string
  orderId: string
  type: 'PAYMENT' | 'CANCEL' | 'REFUND'
  amount: number
  status: PaymentStatus
  method: PaymentMethod
  metadata?: Record<string, string>
  createdAt: Date
}
