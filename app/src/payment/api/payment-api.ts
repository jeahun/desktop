/**
 * 결제 API 라우터
 * Payment API Router
 *
 * Express.js 기반 REST API 엔드포인트
 * POST /payments          - 결제 요청
 * POST /payments/approve  - 결제 승인
 * POST /payments/cancel   - 결제 취소
 * GET  /payments/:id      - 결제 조회
 * GET  /payments/order/:orderId - 주문번호로 조회
 * GET  /payments/:id/transactions - 거래내역 조회
 * POST /payments/webhook/verify  - 웹훅 서명 검증
 */

import {
  PaymentMethod,
  Currency,
  PaymentRequest,
  CancelRequest,
  MerchantConfig,
  WebhookPayload,
} from '../types'
import { createPaymentGateway, PaymentGateway } from '../payment-gateway'

// Express 타입 간소화 (의존성 없이 인터페이스만 정의)
interface Request {
  params: Record<string, string>
  body: Record<string, unknown>
  headers: Record<string, string | string[] | undefined>
}

interface Response {
  status(code: number): Response
  json(data: unknown): void
  send(data: string): void
}

type NextFunction = (err?: Error) => void
type Handler = (req: Request, res: Response, next?: NextFunction) => Promise<void> | void

interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  handler: Handler
}

export class PaymentApiRouter {
  private gateway: PaymentGateway
  public routes: Route[] = []

  constructor(config: MerchantConfig) {
    this.gateway = createPaymentGateway(config)
    this.registerRoutes()
  }

  private registerRoutes(): void {
    this.routes = [
      { method: 'POST', path: '/payments', handler: this.initiatePayment.bind(this) },
      { method: 'POST', path: '/payments/approve', handler: this.approvePayment.bind(this) },
      { method: 'POST', path: '/payments/cancel', handler: this.cancelPayment.bind(this) },
      { method: 'GET', path: '/payments/:id', handler: this.getPayment.bind(this) },
      { method: 'GET', path: '/payments/order/:orderId', handler: this.getPaymentByOrderId.bind(this) },
      { method: 'GET', path: '/payments/:id/transactions', handler: this.getTransactions.bind(this) },
      { method: 'POST', path: '/payments/webhook/verify', handler: this.verifyWebhook.bind(this) },
    ]
  }

  /**
   * POST /payments
   * 결제 초기화 - 결제창 URL 반환
   */
  private async initiatePayment(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Partial<PaymentRequest>

      const request: PaymentRequest = {
        orderId: body.orderId as string,
        orderName: body.orderName as string,
        amount: Number(body.amount),
        currency: (body.currency as Currency) ?? Currency.KRW,
        method: body.method as PaymentMethod,
        buyerName: body.buyerName as string,
        buyerEmail: body.buyerEmail as string,
        buyerPhone: body.buyerPhone as string | undefined,
        returnUrl: body.returnUrl as string,
        webhookUrl: body.webhookUrl as string | undefined,
        metadata: body.metadata as Record<string, string> | undefined,
      }

      const payment = await this.gateway.initializePayment(request)

      res.status(200).json({
        success: true,
        data: payment,
        message: '결제가 초기화되었습니다',
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '결제 초기화 실패',
      })
    }
  }

  /**
   * POST /payments/approve
   * 결제 승인 처리
   */
  private async approvePayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId, ...approvalData } = req.body as Record<string, string>

      if (!paymentId) {
        res.status(400).json({ success: false, message: 'paymentId가 필요합니다' })
        return
      }

      const payment = await this.gateway.approvePayment(paymentId, approvalData)

      res.status(200).json({
        success: true,
        data: payment,
        message: '결제가 승인되었습니다',
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '결제 승인 실패',
      })
    }
  }

  /**
   * POST /payments/cancel
   * 결제 취소/환불
   */
  private async cancelPayment(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Partial<CancelRequest>

      const request: CancelRequest = {
        paymentId: body.paymentId as string,
        cancelReason: body.cancelReason as string,
        cancelAmount: body.cancelAmount ? Number(body.cancelAmount) : undefined,
        refundBankCode: body.refundBankCode,
        refundAccountNumber: body.refundAccountNumber,
        refundAccountHolder: body.refundAccountHolder,
      }

      const result = await this.gateway.cancelPayment(request)

      res.status(200).json({
        success: true,
        data: result,
        message: '결제가 취소되었습니다',
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '결제 취소 실패',
      })
    }
  }

  /**
   * GET /payments/:id
   * 결제 조회
   */
  private getPayment(req: Request, res: Response): void {
    const payment = this.gateway.getPayment(req.params.id)

    if (!payment) {
      res.status(404).json({ success: false, message: '결제 정보를 찾을 수 없습니다' })
      return
    }

    res.status(200).json({ success: true, data: payment })
  }

  /**
   * GET /payments/order/:orderId
   * 주문번호로 결제 조회
   */
  private getPaymentByOrderId(req: Request, res: Response): void {
    const payment = this.gateway.getPaymentByOrderId(req.params.orderId)

    if (!payment) {
      res.status(404).json({ success: false, message: '해당 주문의 결제 정보를 찾을 수 없습니다' })
      return
    }

    res.status(200).json({ success: true, data: payment })
  }

  /**
   * GET /payments/:id/transactions
   * 거래 내역 조회
   */
  private getTransactions(req: Request, res: Response): void {
    const transactions = this.gateway.getTransactions(req.params.id)

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
    })
  }

  /**
   * POST /payments/webhook/verify
   * 웹훅 서명 검증
   */
  private verifyWebhook(req: Request, res: Response): void {
    try {
      const payload = req.body as unknown as WebhookPayload

      if (!payload.signature) {
        res.status(400).json({ success: false, message: '서명이 없습니다' })
        return
      }

      const isValid = this.gateway.verifyWebhookSignature(payload)

      res.status(200).json({
        success: true,
        valid: isValid,
        message: isValid ? '유효한 웹훅입니다' : '유효하지 않은 웹훅 서명입니다',
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '웹훅 검증 실패',
      })
    }
  }
}

/**
 * API 라우터 인스턴스 생성
 */
export function createPaymentApiRouter(config: MerchantConfig): PaymentApiRouter {
  return new PaymentApiRouter(config)
}
