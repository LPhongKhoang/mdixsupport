import { Space, Typography, Tooltip as AntTooltip } from 'antd'

const { Text } = Typography

export default function LoadingSpinner({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Space direction="vertical" align="center">
        <AntTooltip title="Fetching data...">
          <div className="ant-spin ant-spin-lg">
            <span className="ant-spin-dot ant-spin-dot-spin">
              <i className="ant-spin-dot-item" />
              <i className="ant-spin-dot-item" />
              <i className="ant-spin-dot-item" />
              <i className="ant-spin-dot-item" />
            </span>
          </div>
        </AntTooltip>
        <Text type="secondary">{message}</Text>
      </Space>
    </div>
  )
}
