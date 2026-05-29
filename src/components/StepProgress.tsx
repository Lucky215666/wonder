import { CheckOutlined, LoadingOutlined, CloseOutlined } from '@ant-design/icons'

interface Step {
  step: string
  status: 'running' | 'done' | 'error'
  label: string
}

interface Props {
  steps: Step[]
}

export default function StepProgress({ steps }: Props) {
  return (
    <div className="wonder-steps-card">
      {steps.map((step, i) => (
        <div key={step.step}>
          <div className="wonder-step-item">
            <div className={`wonder-step-dot wonder-step-dot--${step.status}`}>
              {step.status === 'done' && <CheckOutlined />}
              {step.status === 'running' && <LoadingOutlined />}
              {step.status === 'error' && <CloseOutlined />}
            </div>
            <span className={`wonder-step-label wonder-step-label--${step.status}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`wonder-step-connector ${step.status === 'done' ? 'wonder-step-connector--done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}
