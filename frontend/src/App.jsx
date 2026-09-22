import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Queue from './pages/Queue'
import ReportDetail from './pages/ReportDetail'
import Classify from './pages/Classify'
import Heatmap from './pages/Heatmap'
import Story from './pages/Story'
import FieldMap from './pages/FieldMap'
import FieldCopilot from './pages/FieldCopilot'
import BarrierMigration from './pages/BarrierMigration'
import BarrierModel from './pages/BarrierModel'
import BarrierHealth from './pages/BarrierHealth'

function AuthApp({ user, handleLogin, handleLogout }) {
  if (!user) return <Login onLogin={handleLogin} />
  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/"              element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/barrier-health" element={<BarrierHealth />} />
        <Route path="/queue"         element={<Queue />} />
        <Route path="/report/:id"    element={<ReportDetail />} />
        <Route path="/classify"      element={<Classify />} />
        <Route path="/heatmap"       element={<Heatmap />} />
        <Route path="/story"         element={<Story />} />
        <Route path="/map"           element={<FieldMap />} />
        <Route path="/copilot"       element={<FieldCopilot />} />
        <Route path="/migration"     element={<BarrierMigration />} />
        <Route path="/barrier/:id"   element={<BarrierModel />} />
        <Route path="*"              element={<Navigate to="/barrier-health" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('prevora_user')
    return raw ? JSON.parse(raw) : null
  })

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('prevora_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('prevora_user')
    localStorage.removeItem('prevora_token')
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/*" element={
          <AuthApp user={user} handleLogin={handleLogin} handleLogout={handleLogout} />
        } />
      </Routes>
    </BrowserRouter>
  )
}
