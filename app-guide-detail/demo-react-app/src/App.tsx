import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/Dashboard/DashboardPage'
import GanttChartPage from './pages/GanttChart/GanttChartPage'

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#6366f1', borderRadius: 8 },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/gantt" element={<GanttChartPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
