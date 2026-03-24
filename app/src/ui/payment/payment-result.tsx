import * as React from 'react'
import { PaymentResponse, PaymentStatus, PaymentMethod } from '../../payment/types'
import { IOrderInfo } from './payment-page'

interface IPaymentResultProps {
  readonly payment: PaymentResponse
  readonly order: IOrderInfo
  readonly onDone: (payment: PaymentResponse) => void
}

/**
 * 결제 결과 화면 (성공 / 가상계좌 발급 / 실패)
 */
export class PaymentResult extends React.Component<IPaymentResultProps> {
  public render() {
    const { payment } = this.props

    if (payment.status === PaymentStatus.FAILED) {
      return this.renderFailed()
    }

    if (
      payment.status === PaymentStatus.PENDING &&
      payment.method === PaymentMethod.VIRTUAL_ACCOUNT
    ) {
      return this.renderVirtualAccount()
    }

    return this.renderSuccess()
  }

  private renderSuccess() {
    const { payment, order } = this.props

    return (
      <div className="payment-result payment-result--success">
        <div className="result-icon success-icon">✓</div>
        <h2 className="result-title">결제가 완료되었습니다</h2>
        <p className="result-subtitle">{order.orderName}</p>

        <div className="result-details">
          <div className="detail-row">
            <span className="detail-label">결제금액</span>
            <span className="detail-value amount">
              {payment.amount.toLocaleString()}원
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">결제수단</span>
            <span className="detail-value">{getMethodLabel(payment.method)}</span>
          </div>
          {payment.card && (
            <>
              <div className="detail-row">
                <span className="detail-label">카드번호</span>
                <span className="detail-value mono">{payment.card.cardNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">카드사</span>
                <span className="detail-value">{payment.card.cardCompany}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">할부</span>
                <span className="detail-value">
                  {payment.card.installmentMonths === 0
                    ? '일시불'
                    : `${payment.card.installmentMonths}개월`}
                </span>
              </div>
              {payment.card.approvalNumber && (
                <div className="detail-row">
                  <span className="detail-label">승인번호</span>
                  <span className="detail-value mono">{payment.card.approvalNumber}</span>
                </div>
              )}
            </>
          )}
          {payment.easyPay && (
            <div className="detail-row">
              <span className="detail-label">결제앱</span>
              <span className="detail-value">{getMethodLabel(payment.method)}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">주문번호</span>
            <span className="detail-value mono">{payment.orderId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">결제시간</span>
            <span className="detail-value">
              {formatDate(payment.paidAt ?? payment.updatedAt)}
            </span>
          </div>
        </div>

        {payment.receiptUrl && (
          <a className="receipt-link" href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
            영수증 보기
          </a>
        )}

        <button className="btn-done" onClick={() => this.props.onDone(payment)}>
          확인
        </button>
      </div>
    )
  }

  private renderVirtualAccount() {
    const { payment, order } = this.props
    const va = payment.virtualAccount!

    return (
      <div className="payment-result payment-result--virtual-account">
        <div className="result-icon va-icon">🏦</div>
        <h2 className="result-title">가상계좌가 발급되었습니다</h2>
        <p className="result-subtitle">아래 계좌로 입금해주세요</p>

        <div className="va-account-box">
          <div className="va-bank">{va.bankName}</div>
          <div className="va-number">{va.accountNumber}</div>
          <div className="va-holder">예금주: {va.accountHolder}</div>
          <button
            className="btn-copy"
            onClick={() => this.copyToClipboard(va.accountNumber)}
          >
            계좌번호 복사
          </button>
        </div>

        <div className="result-details">
          <div className="detail-row">
            <span className="detail-label">입금금액</span>
            <span className="detail-value amount">
              {payment.amount.toLocaleString()}원
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">입금기한</span>
            <span className="detail-value warning">
              {formatDate(va.expiresAt)} 까지
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">주문명</span>
            <span className="detail-value">{order.orderName}</span>
          </div>
        </div>

        <div className="va-notice">
          <p>⚠ 입금기한 내에 입금하지 않으면 주문이 자동으로 취소됩니다</p>
          <p>✓ 입금 확인 후 주문이 처리됩니다</p>
        </div>

        <button className="btn-done" onClick={() => this.props.onDone(payment)}>
          확인
        </button>
      </div>
    )
  }

  private renderFailed() {
    const { payment } = this.props

    return (
      <div className="payment-result payment-result--failed">
        <div className="result-icon fail-icon">✕</div>
        <h2 className="result-title">결제에 실패하였습니다</h2>
        <p className="result-subtitle fail-reason">
          {payment.failReason ?? '결제 처리 중 오류가 발생했습니다'}
        </p>

        <div className="fail-actions">
          <button className="btn-retry" onClick={() => window.location.reload()}>
            다시 시도
          </button>
          <button className="btn-cancel" onClick={() => this.props.onDone(payment)}>
            취소
          </button>
        </div>
      </div>
    )
  }

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      // fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
  }
}

function getMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.CARD]: '신용/체크카드',
    [PaymentMethod.VIRTUAL_ACCOUNT]: '가상계좌',
    [PaymentMethod.BANK_TRANSFER]: '계좌이체',
    [PaymentMethod.KAKAO_PAY]: '카카오페이',
    [PaymentMethod.NAVER_PAY]: '네이버페이',
    [PaymentMethod.TOSS_PAY]: '토스페이',
  }
  return labels[method] ?? method
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
