import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'antd'
import {
  DashboardOutlined,
  ScheduleOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Sales Dashboard',
  },
  {
    key: '/gantt',
    icon: <ScheduleOutlined />,
    label: 'Gantt Chart',
  },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ borderRight: 0 }}
    />
  )
}
