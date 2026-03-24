import * as React from 'react'
import { IOrderInfo } from './payment-page'
import { Currency } from '../../payment/types'

interface IOrderSummaryProps {
  readonly order: IOrderInfo
}

/**
 * 주문 요약 사이드바
 */
export class OrderSummary extends React.Component<IOrderSummaryProps> {
  public render() {
    const { order } = this.props
    const vat = Math.round(order.amount / 11)
    const supplyAmount = order.amount - vat

    return (
      <div className="order-summary">
        <h3 className="summary-title">주문 정보</h3>

        <div className="summary-product">
          <div className="product-icon">🛍️</div>
          <div className="product-info">
            <div className="product-name">{order.orderName}</div>
            <div className="product-id">주문번호: {shortenOrderId(order.orderId)}</div>
          </div>
        </div>

        <div className="summary-divider" />

        <div className="summary-buyer">
          <div className="summary-row">
            <span className="row-label">구매자</span>
            <span className="row-value">{order.buyerName}</span>
          </div>
          <div className="summary-row">
            <span className="row-label">이메일</span>
            <span className="row-value">{order.buyerEmail}</span>
          </div>
          {order.buyerPhone && (
            <div className="summary-row">
              <span className="row-label">연락처</span>
              <span className="row-value">{order.buyerPhone}</span>
            </div>
          )}
        </div>

        <div className="summary-divider" />

        <div className="summary-amount">
          <div className="summary-row">
            <span className="row-label">공급가액</span>
            <span className="row-value">{supplyAmount.toLocaleString()}원</span>
          </div>
          <div className="summary-row">
            <span className="row-label">부가세(10%)</span>
            <span className="row-value">{vat.toLocaleString()}원</span>
          </div>
          <div className="summary-row total">
            <span className="row-label">최종 결제금액</span>
            <span className="row-value total-amount">
              {formatCurrency(order.amount, order.currency)}
            </span>
          </div>
        </div>

        <div className="summary-security">
          <span>🔒</span>
          <span>256bit SSL 암호화 결제</span>
        </div>
      </div>
    )
  }
}

function formatCurrency(amount: number, currency: Currency): string {
  if (currency === Currency.KRW) {
    return `${amount.toLocaleString()}원`
  }
  if (currency === Currency.USD) {
    return `$${(amount / 100).toFixed(2)}`
  }
  return `${amount.toLocaleString()} ${currency}`
}

function shortenOrderId(orderId: string): string {
  if (orderId.length <= 16) {
    return orderId
  }
  return `${orderId.substring(0, 8)}...${orderId.substring(orderId.length - 6)}`
}
