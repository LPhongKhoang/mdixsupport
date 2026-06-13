import { useCallback } from 'react'
import { Gantt, ViewMode } from 'gantt-task-react'
import type { Task } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'

interface GanttViewProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
}

export default function GanttView({ tasks, onTasksChange }: GanttViewProps) {
  const handleDateChange = useCallback(
    (task: Task) => {
      onTasksChange(
        tasks.map((t) =>
          t.id === task.id
            ? { ...t, start: task.start, end: task.end }
            : t,
        ),
      )
    },
    [tasks, onTasksChange],
  )

  const handleExpanderClick = useCallback(
    (task: Task) => {
      onTasksChange(
        tasks.map((t) =>
          t.id === task.id
            ? { ...t, hideChildren: !t.hideChildren }
            : t,
        ),
      )
    },
    [tasks, onTasksChange],
  )

  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
      <Gantt
        tasks={tasks}
        viewMode={ViewMode.Month}
        onDateChange={handleDateChange}
        onExpanderClick={handleExpanderClick}
        listCellWidth="320px"
        headerHeight={50}
        rowHeight={45}
        columnWidth={80}
        barCornerRadius={4}
        barFill={65}
        handleWidth={6}
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="13px"
        todayColor="rgba(99, 102, 241, 0.15)"
        arrowColor="#94a3b8"
        arrowIndent={16}
        ganttHeight={window.innerHeight - 200}
        preStepsCount={1}
      />
    </div>
  )
}
