import * as React from 'react'
import * as classNames from 'classnames'

export interface ICardFormData {
  readonly cardNumber: string
  readonly expiry: string
  readonly cvc: string
  readonly cardHolder: string
  readonly cardCompany: string
  readonly installmentMonths: number
}

interface ICardFormProps {
  readonly amount: number
  readonly onBack: () => void
  readonly onSubmit: (data: ICardFormData) => void
}

interface ICardFormState {
  readonly cardNumber: string
  readonly expiry: string
  readonly cvc: string
  readonly cardHolder: string
  readonly cardCompany: string
  readonly installmentMonths: number
  readonly errors: Partial<Record<keyof ICardFormData, string>>
  readonly cardFlipped: boolean
}

const CARD_COMPANIES = [
  '삼성카드', 'KB국민카드', '신한카드', '현대카드',
  '롯데카드', '우리카드', '하나카드', 'NH농협카드',
  'BC카드', '씨티카드',
]

const INSTALLMENTS = [
  { value: 0, label: '일시불' },
  { value: 2, label: '2개월' },
  { value: 3, label: '3개월' },
  { value: 4, label: '4개월' },
  { value: 5, label: '5개월' },
  { value: 6, label: '6개월' },
  { value: 10, label: '10개월' },
  { value: 12, label: '12개월' },
]

/**
 * 카드 결제 폼 컴포넌트
 */
export class CardForm extends React.Component<ICardFormProps, ICardFormState> {
  private cardNumberRef = React.createRef<HTMLInputElement>()
  private expiryRef = React.createRef<HTMLInputElement>()
  private cvcRef = React.createRef<HTMLInputElement>()
  private cardHolderRef = React.createRef<HTMLInputElement>()

  public constructor(props: ICardFormProps) {
    super(props)
    this.state = {
      cardNumber: '',
      expiry: '',
      cvc: '',
      cardHolder: '',
      cardCompany: '',
      installmentMonths: 0,
      errors: {},
      cardFlipped: false,
    }
  }

  public render() {
    const {
      cardNumber, expiry, cvc, cardHolder,
      cardCompany, installmentMonths, errors, cardFlipped,
    } = this.state
    const { amount, onBack } = this.props

    return (
      <div className="card-form">
        <h2 className="section-title">카드 정보 입력</h2>

        {/* 카드 미리보기 */}
        <div className={classNames('card-preview', { flipped: cardFlipped })}>
          <div className="card-front">
            <div className="card-chip" />
            <div className="card-number-display">
              {formatCardDisplay(cardNumber)}
            </div>
            <div className="card-bottom">
              <div className="card-holder-display">
                {cardHolder || '카드 소유자'}
              </div>
              <div className="card-expiry-display">
                {expiry || 'MM/YY'}
              </div>
            </div>
            <div className="card-company-display">{cardCompany || ''}</div>
          </div>
          <div className="card-back">
            <div className="card-stripe" />
            <div className="card-cvc-row">
              <div className="card-cvc-label">CVC</div>
              <div className="card-cvc-display">{'*'.repeat(cvc.length) || '***'}</div>
            </div>
          </div>
        </div>

        {/* 폼 필드들 */}
        <div className="form-fields">

          {/* 카드번호 */}
          <div className={classNames('form-group', { error: errors.cardNumber })}>
            <label htmlFor="card-number">카드번호</label>
            <input
              id="card-number"
              ref={this.cardNumberRef}
              type="text"
              inputMode="numeric"
              maxLength={19}
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={this.handleCardNumberChange}
              autoComplete="cc-number"
            />
            {errors.cardNumber && (
              <span className="error-msg">{errors.cardNumber}</span>
            )}
          </div>

          {/* 유효기간 + CVC */}
          <div className="form-row">
            <div className={classNames('form-group', { error: errors.expiry })}>
              <label htmlFor="expiry">유효기간</label>
              <input
                id="expiry"
                ref={this.expiryRef}
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="MM/YY"
                value={expiry}
                onChange={this.handleExpiryChange}
                autoComplete="cc-exp"
              />
              {errors.expiry && (
                <span className="error-msg">{errors.expiry}</span>
              )}
            </div>

            <div className={classNames('form-group', { error: errors.cvc })}>
              <label htmlFor="cvc">
                CVC
                <span className="field-hint">카드 뒷면 3자리</span>
              </label>
              <input
                id="cvc"
                ref={this.cvcRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="000"
                value={cvc}
                onChange={this.handleCvcChange}
                onFocus={() => this.setState({ cardFlipped: true })}
                onBlur={() => this.setState({ cardFlipped: false })}
                autoComplete="cc-csc"
              />
              {errors.cvc && (
                <span className="error-msg">{errors.cvc}</span>
              )}
            </div>
          </div>

          {/* 카드 소유자명 */}
          <div className={classNames('form-group', { error: errors.cardHolder })}>
            <label htmlFor="card-holder">카드 소유자명</label>
            <input
              id="card-holder"
              ref={this.cardHolderRef}
              type="text"
              placeholder="홍길동"
              value={cardHolder}
              onChange={e => this.setState({ cardHolder: e.target.value })}
              autoComplete="cc-name"
            />
            {errors.cardHolder && (
              <span className="error-msg">{errors.cardHolder}</span>
            )}
          </div>

          {/* 카드사 선택 */}
          <div className={classNames('form-group', { error: errors.cardCompany })}>
            <label htmlFor="card-company">카드사</label>
            <select
              id="card-company"
              value={cardCompany}
              onChange={e => this.setState({ cardCompany: e.target.value })}
            >
              <option value="">카드사 선택</option>
              {CARD_COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.cardCompany && (
              <span className="error-msg">{errors.cardCompany}</span>
            )}
          </div>

          {/* 할부 선택 */}
          <div className="form-group">
            <label htmlFor="installment">할부 개월</label>
            <select
              id="installment"
              value={installmentMonths}
              onChange={e => this.setState({ installmentMonths: Number(e.target.value) })}
            >
              {INSTALLMENTS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                  {opt.value >= 2 ? ` (월 ${Math.ceil(amount / opt.value).toLocaleString()}원)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 결제 안내 */}
        <div className="payment-notice">
          <p>✓ 카드 정보는 암호화되어 안전하게 처리됩니다</p>
          <p>✓ 결제 후 영수증이 이메일로 발송됩니다</p>
        </div>

        {/* 버튼 */}
        <div className="form-actions">
          <button className="btn-back" type="button" onClick={onBack}>
            뒤로
          </button>
          <button className="btn-pay" type="button" onClick={this.handleSubmit}>
            {amount.toLocaleString()}원 결제하기
          </button>
        </div>
      </div>
    )
  }

  // ─── 이벤트 핸들러 ────────────────────────────────────────────────

  private handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').substring(0, 16)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
    this.setState({ cardNumber: formatted })

    // 16자리 입력 완료 시 다음 필드로 이동
    if (raw.length === 16 && this.expiryRef.current) {
      this.expiryRef.current.focus()
    }
  }

  private handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').substring(0, 4)
    let formatted = raw
    if (raw.length >= 2) {
      formatted = `${raw.substring(0, 2)}/${raw.substring(2)}`
    }
    this.setState({ expiry: formatted })

    if (raw.length === 4 && this.cvcRef.current) {
      this.cvcRef.current.focus()
    }
  }

  private handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cvc = e.target.value.replace(/\D/g, '').substring(0, 4)
    this.setState({ cvc })

    if (cvc.length >= 3 && this.cardHolderRef.current) {
      this.cardHolderRef.current.focus()
    }
  }

  private handleSubmit = () => {
    const errors = this.validate()
    if (Object.keys(errors).length > 0) {
      this.setState({ errors })
      return
    }

    const { cardNumber, expiry, cvc, cardHolder, cardCompany, installmentMonths } = this.state
    this.props.onSubmit({
      cardNumber,
      expiry,
      cvc,
      cardHolder,
      cardCompany,
      installmentMonths,
    })
  }

  private validate(): Partial<Record<keyof ICardFormData, string>> {
    const { cardNumber, expiry, cvc, cardHolder, cardCompany } = this.state
    const errors: Partial<Record<keyof ICardFormData, string>> = {}

    const rawNumber = cardNumber.replace(/\s/g, '')
    if (rawNumber.length < 15) {
      errors.cardNumber = '카드번호를 올바르게 입력해주세요'
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      errors.expiry = '유효기간을 MM/YY 형식으로 입력해주세요'
    } else {
      const [mm, yy] = expiry.split('/').map(Number)
      const now = new Date()
      const exp = new Date(2000 + yy, mm - 1)
      if (mm < 1 || mm > 12 || exp < now) {
        errors.expiry = '유효기간이 올바르지 않습니다'
      }
    }

    if (cvc.length < 3) {
      errors.cvc = 'CVC 3자리를 입력해주세요'
    }

    if (!cardHolder.trim()) {
      errors.cardHolder = '카드 소유자명을 입력해주세요'
    }

    if (!cardCompany) {
      errors.cardCompany = '카드사를 선택해주세요'
    }

    return errors
  }
}

/** 카드번호 표시용 포맷 (입력 안된 자리는 •로 표시) */
function formatCardDisplay(cardNumber: string): string {
  const digits = cardNumber.replace(/\s/g, '')
  const groups = []
  for (let i = 0; i < 4; i++) {
    const start = i * 4
    const slice = digits.substring(start, start + 4)
    groups.push(slice.padEnd(4, '•'))
  }
  return groups.join('  ')
}
