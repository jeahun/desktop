import * as React from 'react'
import * as classNames from 'classnames'
import { PaymentMethodSelector } from './payment-method-selector'
import { CardForm, ICardFormData } from './card-form'
import { OrderSummary } from './order-summary'
import { PaymentResult } from './payment-result'
import {
  PaymentMethod,
  Currency,
  PaymentStatus,
  PaymentResponse,
} from '../../payment/types'
import {
  createPaymentGateway,
  PaymentGateway,
} from '../../payment/payment-gateway'

type PaymentStep = 'select' | 'input' | 'processing' | 'result'

export interface IOrderInfo {
  readonly orderId: string
  readonly orderName: string
  readonly amount: number
  readonly currency: Currency
  readonly buyerName: string
  readonly buyerEmail: string
  readonly buyerPhone?: string
}

interface IPaymentPageProps {
  readonly order: IOrderInfo
  readonly onComplete: (payment: PaymentResponse) => void
  readonly onCancel: () => void
}

interface IPaymentPageState {
  readonly step: PaymentStep
  readonly selectedMethod: PaymentMethod | null
  readonly payment: PaymentResponse | null
  readonly error: string | null
}

const DEFAULT_ORDER: IOrderInfo = {
  orderId: `ORDER_${Date.now()}`,
  orderName: '테스트 상품',
  amount: 29900,
  currency: Currency.KRW,
  buyerName: '홍길동',
  buyerEmail: 'buyer@example.com',
  buyerPhone: '010-1234-5678',
}

/**
 * 결제 페이지 메인 컴포넌트
 * 결제 수단 선택 → 정보 입력 → 처리 → 결과 흐름
 */
export class PaymentPage extends React.Component<
  IPaymentPageProps,
  IPaymentPageState
> {
  public static defaultProps: Partial<IPaymentPageProps> = {
    order: DEFAULT_ORDER,
    onComplete: () => undefined,
    onCancel: () => undefined,
  }

  private gateway: PaymentGateway

  public constructor(props: IPaymentPageProps) {
    super(props)

    this.gateway = createPaymentGateway({
      merchantId: 'MERCHANT_DEMO',
      secretKey: 'demo-secret-key-32chars-minimum!!',
      encryptKey: 'demo-encrypt-key',
      testMode: true,
      allowedMethods: [
        PaymentMethod.CARD,
        PaymentMethod.VIRTUAL_ACCOUNT,
        PaymentMethod.KAKAO_PAY,
        PaymentMethod.NAVER_PAY,
        PaymentMethod.TOSS_PAY,
        PaymentMethod.BANK_TRANSFER,
      ],
    })

    this.state = {
      step: 'select',
      selectedMethod: null,
      payment: null,
      error: null,
    }
  }

  public render() {
    const { step } = this.state
    const { order } = this.props

    return (
      <div className="payment-page">
        {/* 헤더 */}
        <div className="payment-header">
          <h1 className="payment-title">안전결제</h1>
          <div className="payment-badge">
            <span className="badge-icon">🔒</span>
            <span>SSL 보안결제</span>
          </div>
        </div>

        {/* 진행 단계 표시 */}
        {step !== 'result' && (
          <div className="payment-steps">
            <div className={classNames('step', { active: step === 'select', done: step !== 'select' })}>
              <span className="step-number">1</span>
              <span className="step-label">결제수단</span>
            </div>
            <div className="step-divider" />
            <div className={classNames('step', { active: step === 'input', done: step === 'processing' })}>
              <span className="step-number">2</span>
              <span className="step-label">정보입력</span>
            </div>
            <div className="step-divider" />
            <div className={classNames('step', { active: step === 'processing' })}>
              <span className="step-number">3</span>
              <span className="step-label">결제완료</span>
            </div>
          </div>
        )}

        <div className="payment-body">
          {/* 좌측: 결제 콘텐츠 */}
          <div className="payment-content">
            {step === 'select' && this.renderSelectStep()}
            {step === 'input' && this.renderInputStep()}
            {step === 'processing' && this.renderProcessingStep()}
            {step === 'result' && this.renderResultStep()}
          </div>

          {/* 우측: 주문 요약 (결과 화면 제외) */}
          {step !== 'result' && (
            <div className="payment-sidebar">
              <OrderSummary order={order} />
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        {step === 'select' && (
          <div className="payment-footer">
            <button className="btn-cancel" onClick={this.props.onCancel}>
              취소
            </button>
            <button
              className="btn-next"
              disabled={!this.state.selectedMethod}
              onClick={this.handleMethodSelected}
            >
              다음
            </button>
          </div>
        )}
      </div>
    )
  }

  private renderSelectStep() {
    return (
      <PaymentMethodSelector
        selectedMethod={this.state.selectedMethod}
        onMethodSelected={method => this.setState({ selectedMethod: method, error: null })}
      />
    )
  }

  private renderInputStep() {
    const { selectedMethod, error } = this.state
    const { order } = this.props

    if (!selectedMethod) {
      return null
    }

    // 간편결제 (카카오, 네이버, 토스)
    if (
      selectedMethod === PaymentMethod.KAKAO_PAY ||
      selectedMethod === PaymentMethod.NAVER_PAY ||
      selectedMethod === PaymentMethod.TOSS_PAY
    ) {
      return (
        <div className="easy-pay-section">
          <div className="easy-pay-logo">
            {this.getEasyPayLogo(selectedMethod)}
          </div>
          <p className="easy-pay-desc">
            {this.getEasyPayName(selectedMethod)}로 결제합니다.
            <br />
            <strong>{order.amount.toLocaleString()}원</strong>을 결제하시겠습니까?
          </p>
          {error && <div className="payment-error">{error}</div>}
          <div className="easy-pay-actions">
            <button className="btn-back" onClick={this.handleBack}>뒤로</button>
            <button className="btn-pay easy-pay" onClick={this.handleEasyPay}>
              {this.getEasyPayName(selectedMethod)}로 결제하기
            </button>
          </div>
        </div>
      )
    }

    // 가상계좌
    if (selectedMethod === PaymentMethod.VIRTUAL_ACCOUNT) {
      return (
        <div className="virtual-account-section">
          <h3>가상계좌 발급</h3>
          <p className="va-desc">
            결제하기 버튼을 누르면 가상계좌가 발급됩니다.
            <br />
            발급된 계좌로 <strong>3일 이내</strong>에 입금해주세요.
          </p>
          {error && <div className="payment-error">{error}</div>}
          <div className="va-actions">
            <button className="btn-back" onClick={this.handleBack}>뒤로</button>
            <button className="btn-pay" onClick={this.handleVirtualAccount}>
              가상계좌 발급받기
            </button>
          </div>
        </div>
      )
    }

    // 카드 결제
    return (
      <div className="card-payment-section">
        {error && <div className="payment-error">{error}</div>}
        <CardForm
          amount={order.amount}
          onBack={this.handleBack}
          onSubmit={this.handleCardPayment}
        />
      </div>
    )
  }

  private renderProcessingStep() {
    return (
      <div className="processing-section">
        <div className="processing-spinner" />
        <p className="processing-text">결제를 처리하고 있습니다...</p>
        <p className="processing-sub">잠시만 기다려주세요</p>
      </div>
    )
  }

  private renderResultStep() {
    const { payment } = this.state
    if (!payment) {
      return null
    }
    return (
      <PaymentResult
        payment={payment}
        order={this.props.order}
        onDone={this.props.onComplete}
      />
    )
  }

  // ─── 이벤트 핸들러 ────────────────────────────────────────────────

  private handleMethodSelected = () => {
    if (this.state.selectedMethod) {
      this.setState({ step: 'input', error: null })
    }
  }

  private handleBack = () => {
    this.setState({ step: 'select', error: null })
  }

  private handleCardPayment = async (cardData: ICardFormData) => {
    const { order } = this.props
    this.setState({ step: 'processing', error: null })

    try {
      const initiated = await this.gateway.initializePayment({
        orderId: order.orderId,
        orderName: order.orderName,
        amount: order.amount,
        currency: order.currency,
        method: PaymentMethod.CARD,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        buyerPhone: order.buyerPhone,
        returnUrl: 'https://example.com/payment/result',
      })

      // 승인 처리 (실제로는 PG사 결제창 → 리다이렉트 후 처리)
      const approved = await this.gateway.approvePayment(initiated.paymentId, {
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardCompany: cardData.cardCompany,
        cardType: 'CREDIT',
        installmentMonths: String(cardData.installmentMonths),
      })

      this.setState({ step: 'result', payment: approved })
    } catch (err) {
      const failedPayment: PaymentResponse = {
        paymentId: `PAY_FAIL_${Date.now()}`,
        orderId: order.orderId,
        status: PaymentStatus.FAILED,
        method: PaymentMethod.CARD,
        amount: order.amount,
        currency: order.currency,
        failReason: err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.setState({ step: 'result', payment: failedPayment })
    }
  }

  private handleEasyPay = async () => {
    const { order } = this.props
    const { selectedMethod } = this.state
    if (!selectedMethod) {
      return
    }

    this.setState({ step: 'processing', error: null })

    try {
      const initiated = await this.gateway.initializePayment({
        orderId: order.orderId,
        orderName: order.orderName,
        amount: order.amount,
        currency: order.currency,
        method: selectedMethod,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        returnUrl: 'https://example.com/payment/result',
      })

      const approved = await this.gateway.approvePayment(initiated.paymentId, {})
      this.setState({ step: 'result', payment: approved })
    } catch (err) {
      this.setState({
        step: 'input',
        error: err instanceof Error ? err.message : '결제 오류',
      })
    }
  }

  private handleVirtualAccount = async () => {
    const { order } = this.props
    this.setState({ step: 'processing', error: null })

    try {
      const payment = await this.gateway.initializePayment({
        orderId: order.orderId,
        orderName: order.orderName,
        amount: order.amount,
        currency: order.currency,
        method: PaymentMethod.VIRTUAL_ACCOUNT,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        returnUrl: 'https://example.com/payment/result',
      })

      this.setState({ step: 'result', payment })
    } catch (err) {
      this.setState({
        step: 'input',
        error: err instanceof Error ? err.message : '가상계좌 발급 오류',
      })
    }
  }

  private getEasyPayName(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.KAKAO_PAY: return '카카오페이'
      case PaymentMethod.NAVER_PAY: return '네이버페이'
      case PaymentMethod.TOSS_PAY: return '토스페이'
      default: return '간편결제'
    }
  }

  private getEasyPayLogo(method: PaymentMethod): React.ReactNode {
    const logos: Record<string, string> = {
      KAKAO_PAY: '🟡',
      NAVER_PAY: '🟢',
      TOSS_PAY: '🔵',
    }
    return (
      <span className="easy-pay-icon">{logos[method] ?? '💳'}</span>
    )
  }
}
