import { Button } from 'antd'
import { CheckOutlined, LoadingOutlined, CloseOutlined, StopOutlined } from '@ant-design/icons'

interface Step {
  step: string
  status: 'running' | 'done' | 'error' | 'cancelled'
  label: string
  progress?: number
  progressTotal?: number
}

interface Props {
  steps: Step[]
  running?: boolean
  onCancel?: () => void
}

export default function StepProgress({ steps, running, onCancel }: Props) {
  return (
    <div className="wonder-steps-card">
      {steps.map((step, i) => (
        <div key={step.step}>
          <div className="wonder-step-item">
            <div className={`wonder-step-dot wonder-step-dot--${step.status}`}>
              {step.status === 'done' && <CheckOutlined />}
              {step.status === 'running' && <LoadingOutlined />}
              {step.status === 'error' && <CloseOutlined />}
              {step.status === 'cancelled' && <StopOutlined />}
            </div>
            <div className="wonder-step-text">
              <span className={`wonder-step-label wonder-step-label--${step.status}`}>
                {step.label}
              </span>
              {step.status === 'running' && step.progress !== undefined && step.progress > 0 && (
                <span className="wonder-step-progress-text">
                  已处理 {step.progress}{step.progressTotal ? `/${step.progressTotal}` : ''} 个 chunk
                </span>
              )}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`wonder-step-connector ${step.status === 'done' ? 'wonder-step-connector--done' : ''}`} />
          )}
        </div>
      ))}
      {running && onCancel && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button danger icon={<StopOutlined />} onClick={onCancel} size="small">
            取消分析
          </Button>
        </div>
      )}
    </div>
  )
}
