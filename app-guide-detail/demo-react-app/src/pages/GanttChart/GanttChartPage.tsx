import { useState, useMemo } from 'react'
import { Card, Typography, Tag, Space } from 'antd'
import { ScheduleOutlined } from '@ant-design/icons'
import ganttRawData from '../../data/gantt-item-samsung01.json'
import { transformGanttData } from '../../types/gantt'
import type { GanttRawItem } from '../../types/gantt'
import GanttView from './GanttView'
import type { Task } from 'gantt-task-react'

const { Title, Text } = Typography

const tasks = transformGanttData(ganttRawData as GanttRawItem[])

export default function GanttChartPage() {
  const [ganttTasks, setGanttTasks] = useState<Task[]>(tasks)

  const stats = useMemo(() => {
    let total = 0
    let completed = 0
    const countTasks = (list: Task[]) => {
      for (const t of list) {
        total++
        if (t.progress >= 100) completed++
        if (t.children) countTasks(t.children)
      }
    }
    countTasks(ganttTasks)
    return { total, completed, inProgress: total - completed }
  }, [ganttTasks])

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ScheduleOutlined style={{ marginRight: 8, color: '#6366f1' }} />
          Samsung Product Planning — Gantt Chart
        </Title>
        <Text type="secondary">Interactive product development timeline with drag-to-edit</Text>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large">
          <Tag color="blue">Total Items: {stats.total}</Tag>
          <Tag color="green">Completed: {stats.completed}</Tag>
          <Tag color="orange">In Progress: {stats.inProgress}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 Drag task bars to change dates · Click ▶ to expand/collapse
          </Text>
        </Space>
      </Card>

      <GanttView tasks={ganttTasks} onTasksChange={setGanttTasks} />
    </>
  )
}
