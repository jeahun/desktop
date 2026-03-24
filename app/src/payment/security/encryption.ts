/**
 * 결제 보안 - 암호화/복호화 유틸리티
 * Payment Security - Encryption/Decryption Utilities
 * AES-256-CBC 방식 사용
 */

import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16  // 128 bits

/**
 * AES-256-CBC 암호화
 */
export function encrypt(plainText: string, secretKey: string): string {
  const key = normalizeKey(secretKey)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // IV + 암호화된 데이터를 함께 반환 (콜론으로 구분)
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * AES-256-CBC 복호화
 */
export function decrypt(encryptedText: string, secretKey: string): string {
  const key = normalizeKey(secretKey)
  const parts = encryptedText.split(':')

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * HMAC-SHA256 서명 생성 (웹훅 검증용)
 */
export function generateHmacSignature(
  data: string,
  secretKey: string
): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex')
}

/**
 * HMAC-SHA256 서명 검증
 */
export function verifyHmacSignature(
  data: string,
  signature: string,
  secretKey: string
): boolean {
  const expectedSignature = generateHmacSignature(data, secretKey)
  // 타이밍 공격 방지를 위해 timingSafeEqual 사용
  const sigBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (sigBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
}

/**
 * SHA-256 해시 생성
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * 카드번호 마스킹 (앞 6자리 + **** + 뒤 4자리)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '')
  if (cleaned.length < 10) {
    throw new Error('Invalid card number length')
  }
  const first6 = cleaned.substring(0, 6)
  const last4 = cleaned.substring(cleaned.length - 4)
  const masked = '*'.repeat(cleaned.length - 10)
  return `${first6}${masked}${last4}`
}

/**
 * 계좌번호 마스킹 (앞 3자리 + **** + 뒤 4자리)
 */
export function maskAccountNumber(accountNumber: string): string {
  const cleaned = accountNumber.replace(/\D/g, '')
  if (cleaned.length < 7) {
    return '*'.repeat(cleaned.length)
  }
  const first3 = cleaned.substring(0, 3)
  const last4 = cleaned.substring(cleaned.length - 4)
  const masked = '*'.repeat(cleaned.length - 7)
  return `${first3}${masked}${last4}`
}

/**
 * 안전한 랜덤 토큰 생성
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * 결제 ID 생성 (타임스탬프 + 랜덤)
 */
export function generatePaymentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(8).toString('hex').toUpperCase()
  return `PAY_${timestamp}_${random}`
}

/**
 * 주문 검증용 체크섬 생성
 */
export function generateChecksum(
  orderId: string,
  amount: number,
  merchantId: string,
  secretKey: string
): string {
  const data = `${orderId}|${amount}|${merchantId}`
  return generateHmacSignature(data, secretKey)
}

/**
 * 키 정규화 (32바이트로 맞춤)
 */
function normalizeKey(key: string): Buffer {
  const hash = crypto.createHash('sha256').update(key).digest()
  return hash.slice(0, KEY_LENGTH)
}
