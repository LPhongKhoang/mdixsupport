import type { Task } from 'gantt-task-react'

// ─── Level visual config ─────────────────────────────────────
const LEVEL_CONFIG: Record<string, { color: string; bg: string; fontSize: number; fontWeight: number }> = {
  project: { color: '#1e293b', bg: 'transparent', fontSize: 13, fontWeight: 600 },
  task:    { color: '#475569', bg: 'transparent', fontSize: 12, fontWeight: 400 },
}

// ─── Custom Header (only Name column) ────────────────────────
export function CustomTaskListHeader({
  headerHeight,
  rowWidth,
  fontFamily,
  fontSize,
}: {
  headerHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
}) {
  return (
    <div
      style={{
        fontFamily,
        fontSize,
        height: headerHeight - 2,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          minWidth: rowWidth,
          maxWidth: rowWidth,
          padding: '0 12px',
          fontWeight: 600,
          color: '#64748b',
          textTransform: 'uppercase',
          fontSize: 11,
          letterSpacing: 0.5,
        }}
      >
        &nbsp;Task Name
      </div>
    </div>
  )
}

// ─── Custom Table (hierarchy via indent + visual cues) ────────
export function CustomTaskListTable({
  rowHeight,
  rowWidth,
  fontFamily,
  fontSize,
  tasks,
  selectedTaskId,
  setSelectedTask,
  onExpanderClick,
}: {
  rowHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
  tasks: Task[]
  selectedTaskId: string
  setSelectedTask: (taskId: string) => void
  onExpanderClick: (task: Task) => void
}) {
  // Build a map of taskId → depth for indentation
  const depthMap = new Map<string, number>()
  const projectIds = new Set(tasks.filter((t) => t.type === 'project').map((t) => t.id))

  // Calculate depth for each task by traversing the `project` chain
  const getDepth = (task: Task): number => {
    if (depthMap.has(task.id)) return depthMap.get(task.id)!
    if (!task.project) {
      depthMap.set(task.id, 0)
      return 0
    }
    const parentTask = tasks.find((t) => t.id === task.project)
    const depth = parentTask ? getDepth(parentTask) + 1 : 0
    depthMap.set(task.id, depth)
    return depth
  }
  tasks.forEach(getDepth)

  return (
    <div style={{ fontFamily, fontSize }}>
      {tasks.map((t) => {
        const depth = depthMap.get(t.id) ?? 0
        const config = LEVEL_CONFIG[t.type] ?? LEVEL_CONFIG.task
        const isSelected = selectedTaskId === t.id
        const isProject = t.type === 'project'

        // Expander symbol
        let expanderSymbol = ''
        if (t.hideChildren === false) expanderSymbol = '▼'
        else if (t.hideChildren === true) expanderSymbol = '▶'

        return (
          <div
            key={t.id}
            style={{
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
              minWidth: rowWidth,
              maxWidth: rowWidth,
              cursor: 'pointer',
              background: isSelected ? '#eef2ff' : config.bg,
              transition: 'background 0.15s',
            }}
            onClick={() => setSelectedTask(t.id)}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = config.bg
            }}
          >
            {/* Indent + content */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 12 + depth * 20,
                gap: 6,
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* Expander button */}
              {isProject ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    onExpanderClick(t)
                  }}
                  style={{
                    cursor: 'pointer',
                    fontSize: 10,
                    color: '#6366f1',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 3,
                    background: '#eef2ff',
                    flexShrink: 0,
                    transition: 'transform 0.15s',
                  }}
                >
                  {expanderSymbol}
                </span>
              ) : (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#cbd5e1',
                    flexShrink: 0,
                    marginLeft: 5,
                  }}
                />
              )}

              {/* Task name */}
              <span
                style={{
                  fontWeight: config.fontWeight,
                  color: config.color,
                  fontSize: config.fontSize,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {t.name}
              </span>

              {/* Progress badge for project tasks */}
              {isProject && (
                <span
                  style={{
                    fontSize: 10,
                    color: t.progress >= 100 ? '#059669' : t.progress >= 50 ? '#d97706' : '#94a3b8',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {t.progress}%
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
