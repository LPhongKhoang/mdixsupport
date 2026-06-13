import type { Task } from 'gantt-task-react'

// ─── Raw JSON Data Shape ─────────────────────────────────────
export interface GanttRawItem {
  itemId: string
  name: string
  nodeType: 'product area' | 'product family' | 'product' | 'task'
  level: number
  parentId: string | null
  startDate: string
  endDate: string
  progress: number
  notes: string
}

// ─── Color scheme per level ───────────────────────────────────
const LEVEL_STYLES: Record<number, { bg: string; progress: string }> = {
  1: { bg: '#6366f1', progress: '#4f46e5' },  // product area — indigo
  2: { bg: '#8b5cf6', progress: '#7c3aed' },  // product family — violet
  3: { bg: '#3b82f6', progress: '#2563eb' },  // product — blue
  4: { bg: '#10b981', progress: '#059669' },  // task — emerald
}

// ─── Transform flat JSON → gantt-task-react Task[] ────────────
// The original gantt-task-react uses a flat list with `project` field
// pointing to a project-type task's id for grouping.
export function transformGanttData(items: GanttRawItem[]): Task[] {
  const itemMap = new Map<string, GanttRawItem>()
  items.forEach((item) => itemMap.set(item.itemId, item))

  // Sort items by itemId to ensure parents come before children
  const sorted = [...items].sort((a, b) => a.itemId.localeCompare(b.itemId, undefined, { numeric: true }))

  const tasks: Task[] = []
  const idToTaskId = new Map<string, string>() // itemId → gantt task id

  for (const item of sorted) {
    const taskId = item.itemId
    idToTaskId.set(item.itemId, taskId)

    const hasChildren = sorted.some((other) => other.parentId === item.itemId)
    const styles = LEVEL_STYLES[item.level] ?? LEVEL_STYLES[4]

    const task: Task = {
      id: taskId,
      name: item.name,
      type: hasChildren ? 'project' : 'task',
      start: new Date(item.startDate),
      end: new Date(item.endDate),
      progress: Math.round(item.progress * 100),
      styles: {
        backgroundColor: styles.bg,
        progressColor: styles.progress,
      },
      hideChildren: false,
    }

    // Link to parent project task
    if (item.parentId && idToTaskId.has(item.parentId)) {
      task.project = idToTaskId.get(item.parentId)!
    }

    tasks.push(task)
  }

  return tasks
}
