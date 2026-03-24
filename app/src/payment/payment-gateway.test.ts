/**
 * 결제 게이트웨이 테스트
 * Payment Gateway Tests
 */

import { PaymentGateway, createPaymentGateway } from './payment-gateway'
import {
  PaymentMethod,
  PaymentStatus,
  Currency,
  MerchantConfig,
  PaymentRequest,
} from './types'

// 테스트용 가맹점 설정
const TEST_CONFIG: MerchantConfig = {
  merchantId: 'TEST_MERCHANT_001',
  secretKey: 'test-secret-key-minimum-16chars!!',
  encryptKey: 'test-encrypt-key',
  webhookSecret: 'test-webhook-secret',
  testMode: true,
  allowedMethods: [
    PaymentMethod.CARD,
    PaymentMethod.VIRTUAL_ACCOUNT,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.KAKAO_PAY,
    PaymentMethod.NAVER_PAY,
  ],
}

// 테스트용 결제 요청
let orderCounter = 0
function makePaymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    orderId: `ORDER_${Date.now()}_${++orderCounter}`,
    orderName: '테스트 상품',
    amount: 10000,
    currency: Currency.KRW,
    method: PaymentMethod.CARD,
    buyerName: '홍길동',
    buyerEmail: 'buyer@test.com',
    buyerPhone: '010-1234-5678',
    returnUrl: 'https://shop.example.com/result',
    webhookUrl: 'https://shop.example.com/webhook',
    ...overrides,
  }
}

// ─── 단순 테스트 실행기 ────────────────────────────────────────────

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     오류: ${err instanceof Error ? err.message : String(err)}`)
    failed++
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

function assertThrows(fn: () => unknown, expectedMessage?: string): void {
  let threw = false
  try {
    fn()
  } catch (err) {
    threw = true
    if (expectedMessage && err instanceof Error) {
      if (!err.message.includes(expectedMessage)) {
        throw new Error(`Expected "${expectedMessage}" but got "${err.message}"`)
      }
    }
  }
  if (!threw) throw new Error('Expected an error to be thrown')
}

// ─── 테스트 케이스 ────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log('\n🔷 결제 게이트웨이 테스트 시작\n')

  // 1. 게이트웨이 초기화 테스트
  console.log('1. 게이트웨이 초기화')

  await test('정상 설정으로 생성', () => {
    const gw = createPaymentGateway(TEST_CONFIG)
    assert(gw instanceof PaymentGateway, 'PaymentGateway 인스턴스여야 합니다')
  })

  await test('merchantId 없이 생성 시 오류', () => {
    assertThrows(
      () => createPaymentGateway({ ...TEST_CONFIG, merchantId: '' }),
      'merchantId가 필요합니다'
    )
  })

  await test('너무 짧은 secretKey 시 오류', () => {
    assertThrows(
      () => createPaymentGateway({ ...TEST_CONFIG, secretKey: 'short' }),
      'secretKey는 최소 16자'
    )
  })

  await test('허용 결제수단 없이 생성 시 오류', () => {
    assertThrows(
      () => createPaymentGateway({ ...TEST_CONFIG, allowedMethods: [] }),
      '허용된 결제 방법을 최소 1개'
    )
  })

  // 2. 결제 초기화 테스트
  console.log('\n2. 결제 초기화 (initializePayment)')
  const gateway = createPaymentGateway(TEST_CONFIG)

  await test('카드 결제 초기화', async () => {
    const req = makePaymentRequest({ method: PaymentMethod.CARD })
    const result = await gateway.initializePayment(req)

    assert(result.paymentId.startsWith('PAY_'), 'paymentId 형식이 올바르지 않습니다')
    assert(result.status === PaymentStatus.READY, '상태가 READY여야 합니다')
    assert(result.amount === 10000, '금액이 일치해야 합니다')
    assert(!!result.checkoutUrl, '결제창 URL이 있어야 합니다')
  })

  await test('가상계좌 결제 초기화 (즉시 계좌 발급)', async () => {
    const req = makePaymentRequest({ method: PaymentMethod.VIRTUAL_ACCOUNT })
    const result = await gateway.initializePayment(req)

    assert(result.status === PaymentStatus.PENDING, '가상계좌는 PENDING 상태여야 합니다')
    assert(!!result.virtualAccount, '가상계좌 정보가 있어야 합니다')
    assert(!!result.virtualAccount?.accountNumber, '계좌번호가 있어야 합니다')
    assert(!!result.virtualAccount?.expiresAt, '만료일이 있어야 합니다')
  })

  await test('금액 100원 미만 시 오류', async () => {
    let threw = false
    try {
      await gateway.initializePayment(makePaymentRequest({ amount: 50 }))
    } catch (err) {
      threw = true
    }
    assert(threw, '오류가 발생해야 합니다')
  })

  await test('유효하지 않은 이메일 시 오류', async () => {
    let threw = false
    try {
      await gateway.initializePayment(makePaymentRequest({ buyerEmail: 'not-an-email' }))
    } catch (err) {
      threw = true
    }
    assert(threw, '오류가 발생해야 합니다')
  })

  await test('허용되지 않은 결제 방법 시 오류', async () => {
    const gw = createPaymentGateway({ ...TEST_CONFIG, allowedMethods: [PaymentMethod.CARD] })
    let threw = false
    try {
      await gw.initializePayment(makePaymentRequest({ method: PaymentMethod.KAKAO_PAY }))
    } catch (err) {
      threw = true
    }
    assert(threw, '오류가 발생해야 합니다')
  })

  // 3. 결제 승인 테스트
  console.log('\n3. 결제 승인 (approvePayment)')

  await test('카드 결제 승인', async () => {
    const req = makePaymentRequest({ method: PaymentMethod.CARD })
    const initiated = await gateway.initializePayment(req)

    const approved = await gateway.approvePayment(initiated.paymentId, {
      cardNumber: '4111111111111111',
      cardCompany: 'KB국민카드',
      cardType: 'CREDIT',
      installmentMonths: '0',
    })

    assert(approved.status === PaymentStatus.COMPLETED, '상태가 COMPLETED여야 합니다')
    assert(!!approved.paidAt, '결제 시간이 있어야 합니다')
    assert(!!approved.card, '카드 정보가 있어야 합니다')
    assert(!!approved.card?.approvalNumber, '승인번호가 있어야 합니다')
    assert(approved.card?.cardNumber.includes('*') === true, '카드번호가 마스킹되어야 합니다')
  })

  await test('카카오페이 결제 승인', async () => {
    const req = makePaymentRequest({ method: PaymentMethod.KAKAO_PAY })
    const initiated = await gateway.initializePayment(req)
    const approved = await gateway.approvePayment(initiated.paymentId, {})

    assert(approved.status === PaymentStatus.COMPLETED, '상태가 COMPLETED여야 합니다')
    assert(approved.easyPay?.provider === 'KAKAO_PAY', '카카오페이 정보가 있어야 합니다')
  })

  await test('금액 변조 감지', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)

    let threw = false
    try {
      await gateway.approvePayment(initiated.paymentId, {
        amount: '99999',  // 변조된 금액
      })
    } catch (err) {
      threw = true
    }
    assert(threw, '금액 변조 시 오류가 발생해야 합니다')
  })

  // 4. 결제 조회 테스트
  console.log('\n4. 결제 조회')

  await test('결제 ID로 조회', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)
    const found = gateway.getPayment(initiated.paymentId)

    assert(!!found, '결제 정보를 찾아야 합니다')
    assert(found?.paymentId === initiated.paymentId, 'paymentId가 일치해야 합니다')
  })

  await test('주문 ID로 조회', async () => {
    const orderId = `ORDER_FIND_${Date.now()}`
    await gateway.initializePayment(makePaymentRequest({ orderId }))
    const found = gateway.getPaymentByOrderId(orderId)

    assert(!!found, '결제 정보를 찾아야 합니다')
    assert(found?.orderId === orderId, 'orderId가 일치해야 합니다')
  })

  await test('존재하지 않는 결제 조회 시 undefined 반환', () => {
    const result = gateway.getPayment('PAY_NONEXISTENT')
    assert(result === undefined, 'undefined를 반환해야 합니다')
  })

  // 5. 결제 취소 테스트
  console.log('\n5. 결제 취소 (cancelPayment)')

  await test('전액 취소', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)
    await gateway.approvePayment(initiated.paymentId, {})

    const cancelled = await gateway.cancelPayment({
      paymentId: initiated.paymentId,
      cancelReason: '고객 요청',
    })

    assert(cancelled.cancelAmount === 10000, '전액 취소되어야 합니다')
    assert(cancelled.status === PaymentStatus.REFUNDED, '상태가 REFUNDED여야 합니다')
  })

  await test('부분 취소', async () => {
    const req = makePaymentRequest({ amount: 20000 })
    const initiated = await gateway.initializePayment(req)
    await gateway.approvePayment(initiated.paymentId, {})

    const cancelled = await gateway.cancelPayment({
      paymentId: initiated.paymentId,
      cancelReason: '부분 환불',
      cancelAmount: 5000,
    })

    assert(cancelled.cancelAmount === 5000, '5000원만 취소되어야 합니다')
    assert(cancelled.status === PaymentStatus.PARTIAL_REFUNDED, '상태가 PARTIAL_REFUNDED여야 합니다')
  })

  await test('미완료 결제 취소 시 오류', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)

    let threw = false
    try {
      await gateway.cancelPayment({
        paymentId: initiated.paymentId,
        cancelReason: '테스트',
      })
    } catch (err) {
      threw = true
    }
    assert(threw, '미완료 결제 취소 시 오류가 발생해야 합니다')
  })

  // 6. 거래 내역 테스트
  console.log('\n6. 거래 내역')

  await test('결제 후 거래 내역 조회', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)
    await gateway.approvePayment(initiated.paymentId, {})

    const txns = gateway.getTransactions(initiated.paymentId)
    assert(txns.length >= 1, '거래 내역이 있어야 합니다')
    assert(txns[0].paymentId === initiated.paymentId, 'paymentId가 일치해야 합니다')
  })

  // 7. 웹훅 서명 테스트
  console.log('\n7. 웹훅 서명')

  await test('웹훅 서명 생성 및 검증', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)
    const now = new Date()

    const payload = {
      paymentId: initiated.paymentId,
      orderId: req.orderId,
      status: PaymentStatus.COMPLETED,
      amount: req.amount,
      method: req.method,
      timestamp: now,
    }

    const signature = gateway.generateWebhookSignature(payload)
    const isValid = gateway.verifyWebhookSignature({ ...payload, signature })

    assert(isValid, '웹훅 서명이 유효해야 합니다')
  })

  await test('변조된 웹훅 서명 거부', async () => {
    const req = makePaymentRequest()
    const initiated = await gateway.initializePayment(req)
    const now = new Date()

    const payload = {
      paymentId: initiated.paymentId,
      orderId: req.orderId,
      status: PaymentStatus.COMPLETED,
      amount: req.amount,
      method: req.method,
      timestamp: now,
    }

    const isValid = gateway.verifyWebhookSignature({
      ...payload,
      signature: 'invalid_signature_tampered',
    })

    assert(!isValid, '변조된 서명은 거부되어야 합니다')
  })

  // 결과 출력
  console.log('\n─────────────────────────────────────')
  console.log(`결과: ${passed}개 통과, ${failed}개 실패`)

  if (failed > 0) {
    console.log('⚠️  일부 테스트가 실패했습니다')
  } else {
    console.log('✅ 모든 테스트 통과!')
  }
}

runTests().catch(err => {
  console.error('테스트 실행 오류:', err)
})
