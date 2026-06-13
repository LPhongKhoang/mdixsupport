import { Card, Button, Space, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card style={{ textAlign: 'center', padding: 40 }}>
      <Space direction="vertical" size="large" align="center">
        <Text type="danger" style={{ fontSize: 48 }}>{'⚠️'}</Text>
        <Title level={4} type="danger" style={{ margin: 0 }}>Failed to load data</Title>
        <Text type="secondary">{message}</Text>
        <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
          Retry
        </Button>
      </Space>
    </Card>
  )
}
