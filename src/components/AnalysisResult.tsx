import { Card, Tag, Typography, Button, List } from 'antd'
import {
  FileTextOutlined,
  BookOutlined,
  EditOutlined,
  NumberOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { AnalysisResult as AnalysisResultType } from '../types/analysis'

interface AnalysisResultProps {
  result: AnalysisResultType
  knowledgeBaseId?: string
  onAddToKB?: () => void
}

const ACTION_LABELS: Record<string, { text: string; color: string }> = {
  add: { text: '收录', color: 'green' },
  deep_read: { text: '精读', color: 'blue' },
  skim: { text: '略读', color: 'default' },
  track_citations: { text: '追踪引用', color: 'orange' },
  add_to_other_kb: { text: '加入其他知识库', color: 'purple' },
  ignore: { text: '忽略', color: 'default' },
}

const RELATION_LABELS: Record<string, { text: string; color: string }> = {
  supplement: { text: '补充', color: 'green' },
  duplicate: { text: '重复', color: 'red' },
  conflict: { text: '冲突', color: 'orange' },
  extension: { text: '扩展', color: 'blue' },
  method_reference: { text: '方法参考', color: 'cyan' },
  unrelated: { text: '无关', color: 'default' },
}

function getFitScoreColor(score: number): string {
  if (score >= 70) return 'var(--success, #52c41a)'
  if (score >= 40) return 'var(--warning, #faad14)'
  return 'var(--error, #ff4d4f)'
}

export default function AnalysisResult({ result, knowledgeBaseId, onAddToKB }: AnalysisResultProps) {
  const fitScore = result.knowledgeBaseFitScore
  const action = result.recommendedAction
  const actionInfo = action ? ACTION_LABELS[action] : null
  const relation = result.relationToExistingDocs
  const relationInfo = relation ? RELATION_LABELS[relation.type] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <Card
        size="small"
        title={<><FileTextOutlined /> {'摘要'}</>}
      >
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {result.summary}
        </Typography.Paragraph>
      </Card>

      {/* Fit Score */}
      {(fitScore !== undefined || result.matchScore !== undefined) && (
        <Card size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1,
                color: getFitScoreColor(fitScore ?? result.matchScore ?? 0),
              }}>
                {fitScore ?? result.matchScore}
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {fitScore !== undefined ? '适配分' : '匹配分'}
              </Typography.Text>
            </div>
            <div style={{ flex: 1 }}>
              {actionInfo && (
                <Tag color={actionInfo.color} style={{ fontSize: 13, padding: '2px 10px' }}>
                  {'建议：'}{actionInfo.text}
                </Tag>
              )}
              {result.fitReason && (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {result.fitReason}
                </Typography.Paragraph>
              )}
              {result.matchReason && (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {result.matchReason}
                </Typography.Paragraph>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Suggested Placement */}
      {result.suggestedPlacement && (
        <Card size="small" title={<><BookOutlined /> {'建议归类'}</>}>
          <div style={{ marginBottom: 8 }}>
            <Typography.Text strong>{'子方向：'}</Typography.Text>
            <Typography.Text>{result.suggestedPlacement.subDirection}</Typography.Text>
          </div>
          {result.suggestedPlacement.tags.length > 0 && (
            <div>
              {result.suggestedPlacement.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Relation to Existing Docs */}
      {relation && (
        <Card size="small" title={'与已有文献的关系'}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {relationInfo && (
              <Tag color={relationInfo.color} style={{ flexShrink: 0 }}>
                {relationInfo.text}
              </Tag>
            )}
            <Typography.Paragraph style={{ margin: 0 }}>
              {relation.reason}
            </Typography.Paragraph>
          </div>
        </Card>
      )}

      {/* Novelty for Knowledge Base */}
      {result.noveltyForKnowledgeBase && (
        <Card size="small" title={'对知识库的新贡献'}>
          <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {result.noveltyForKnowledgeBase}
          </Typography.Paragraph>
        </Card>
      )}

      {/* Reading Card */}
      {result.readingCard && (
        <Card size="small" title={<><FileTextOutlined /> {'阅读卡片'}</>}>
          <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {result.readingCard}
          </Typography.Paragraph>
        </Card>
      )}

      {/* Writing Assets */}
      {result.writingAssets && (
        <Card size="small" title={<><EditOutlined /> {'写作资产'}</>}>
          {result.writingAssets.usableClaims.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong>{'可用论点：'}</Typography.Text>
              <List
                size="small"
                dataSource={result.writingAssets.usableClaims}
                renderItem={(item: string) => <List.Item style={{ padding: '4px 0', border: 'none' }}>{item}</List.Item>}
              />
            </div>
          )}
          {result.writingAssets.possibleLiteratureReviewUse && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong>{'文献综述用途：'}</Typography.Text>
              <Typography.Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                {result.writingAssets.possibleLiteratureReviewUse}
              </Typography.Paragraph>
            </div>
          )}
          {result.writingAssets.limitationsOrCritique && (
            <div>
              <Typography.Text strong>{'局限与批评：'}</Typography.Text>
              <Typography.Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                {result.writingAssets.limitationsOrCritique}
              </Typography.Paragraph>
            </div>
          )}
        </Card>
      )}

      {/* README Update Suggestions */}
      {result.readmeUpdateSuggestions && result.readmeUpdateSuggestions.length > 0 && (
        <Card size="small" title={<><NumberOutlined /> {'README 更新建议'}</>}>
          <List
            size="small"
            dataSource={result.readmeUpdateSuggestions}
            renderItem={(item: { section: string; suggestion: string; reason: string }) => (
              <List.Item style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ marginBottom: 4 }}>
                  <Tag color="blue">{item.section}</Tag>
                </div>
                <Typography.Text>{item.suggestion}</Typography.Text>
                {item.reason && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 2 }}>
                    {item.reason}
                  </Typography.Text>
                )}
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Legacy matchScore */}
      {result.matchScore !== undefined && fitScore === undefined && (
        <Card size="small">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: 'var(--accent, #1677ff)' }}>
              {result.matchScore}
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {'匹配分'}
            </Typography.Text>
          </div>
          {result.matchReason && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {result.matchReason}
            </Typography.Paragraph>
          )}
        </Card>
      )}

      {/* Add to KB button */}
      {knowledgeBaseId && onAddToKB && (
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={onAddToKB}
          style={{ alignSelf: 'flex-start' }}
        >
          {'确认收录到知识库'}
        </Button>
      )}
    </div>
  )
}
