import * as React from 'react'
import * as classNames from 'classnames'
import { PaymentMethod } from '../../payment/types'

interface IMethodOption {
  readonly method: PaymentMethod
  readonly label: string
  readonly icon: string
  readonly description: string
  readonly badge?: string
}

const METHOD_OPTIONS: ReadonlyArray<IMethodOption> = [
  {
    method: PaymentMethod.CARD,
    label: '신용/체크카드',
    icon: '💳',
    description: 'VISA, Master, 국내 전 카드 사용 가능',
  },
  {
    method: PaymentMethod.KAKAO_PAY,
    label: '카카오페이',
    icon: '🟡',
    description: '카카오 계정으로 간편 결제',
    badge: '간편',
  },
  {
    method: PaymentMethod.NAVER_PAY,
    label: '네이버페이',
    icon: '🟢',
    description: '네이버 계정으로 간편 결제',
    badge: '간편',
  },
  {
    method: PaymentMethod.TOSS_PAY,
    label: '토스페이',
    icon: '🔵',
    description: '토스 앱으로 간편 결제',
    badge: '간편',
  },
  {
    method: PaymentMethod.VIRTUAL_ACCOUNT,
    label: '가상계좌',
    icon: '🏦',
    description: '입금 전용 계좌로 무통장 입금',
  },
  {
    method: PaymentMethod.BANK_TRANSFER,
    label: '계좌이체',
    icon: '↔️',
    description: '실시간 계좌이체',
  },
]

interface IPaymentMethodSelectorProps {
  readonly selectedMethod: PaymentMethod | null
  readonly onMethodSelected: (method: PaymentMethod) => void
}

export class PaymentMethodSelector extends React.Component<IPaymentMethodSelectorProps> {
  public render() {
    const { selectedMethod, onMethodSelected } = this.props

    return (
      <div className="payment-method-selector">
        <h2 className="section-title">결제수단 선택</h2>

        <div className="method-group">
          <h3 className="group-label">카드결제</h3>
          <div className="method-list">
            {METHOD_OPTIONS.filter(o =>
              o.method === PaymentMethod.CARD
            ).map(option => (
              <MethodCard
                key={option.method}
                option={option}
                selected={selectedMethod === option.method}
                onSelect={() => onMethodSelected(option.method)}
              />
            ))}
          </div>
        </div>

        <div className="method-group">
          <h3 className="group-label">간편결제</h3>
          <div className="method-list method-list--grid">
            {METHOD_OPTIONS.filter(o => o.badge === '간편').map(option => (
              <MethodCard
                key={option.method}
                option={option}
                selected={selectedMethod === option.method}
                onSelect={() => onMethodSelected(option.method)}
              />
            ))}
          </div>
        </div>

        <div className="method-group">
          <h3 className="group-label">계좌결제</h3>
          <div className="method-list">
            {METHOD_OPTIONS.filter(o =>
              o.method === PaymentMethod.VIRTUAL_ACCOUNT ||
              o.method === PaymentMethod.BANK_TRANSFER
            ).map(option => (
              <MethodCard
                key={option.method}
                option={option}
                selected={selectedMethod === option.method}
                onSelect={() => onMethodSelected(option.method)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
}

interface IMethodCardProps {
  readonly option: IMethodOption
  readonly selected: boolean
  readonly onSelect: () => void
}

function MethodCard({ option, selected, onSelect }: IMethodCardProps) {
  return (
    <button
      className={classNames('method-card', { 'method-card--selected': selected })}
      onClick={onSelect}
      type="button"
    >
      <span className="method-icon">{option.icon}</span>
      <div className="method-info">
        <span className="method-label">
          {option.label}
          {option.badge && (
            <span className="method-badge">{option.badge}</span>
          )}
        </span>
        <span className="method-desc">{option.description}</span>
      </div>
      <span className={classNames('method-check', { visible: selected })}>✓</span>
    </button>
  )
}
