import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ListFilter, FlaskConical, LogOut, Shield,
  Flame, BookOpen, Map, Mic, ShieldAlert, AlertTriangle, X,
  GitMerge, Activity, Crosshair, Search, BarChart3, Layers
} from 'lucide-react'
import { api } from '../api'
import './Layout.css'

function NavGroup({ label, children }) {
  return (
    <div className="nav-group">
      <div className="nav-group-label">{label}</div>
      <ul className="nav-list">
        {children}
      </ul>
    </div>
  )
}

function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <li>
      <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Icon size={16} />
        <span>{label}</span>
        {badge != null && badge > 0 && (
          <span className="nav-badge nav-badge-alert">{badge}</span>
        )}
      </NavLink>
    </li>
  )
}

export default function Layout({ user, onLogout, children }) {
  const [convergence, setConvergence] = useState([])
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.getConvergenceZones().then(setConvergence).catch(() => {})
  }, [])

  const topZone = convergence[0]
  const showBanner = topZone && !bannerDismissed

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <Shield size={22} color="#f59e0b" />
          <span className="brand-name">PREVORA</span>
          <span className="brand-sub">SIF Sentinel</span>
        </div>
        <div className="demo-label">
          <span className="demo-dot" />
          SYNTHETIC DEMO · NOT LIVE OIL DATA
        </div>

        {/* ── COMMAND ──────────────────────── */}
        <NavGroup label="COMMAND">
          <NavItem to="/barrier-health" icon={ShieldAlert} label="Defence Monitor" badge={convergence.length} />
          <NavItem to="/dashboard"      icon={LayoutDashboard} label="Overview" />
        </NavGroup>

        {/* ── INTELLIGENCE ─────────────────── */}
        <NavGroup label="INTELLIGENCE">
          <NavItem to="/queue"      icon={ListFilter}  label="Priority Queue" />
          <NavItem to="/migration"  icon={GitMerge}    label="Barrier Migration" />
          <NavItem to="/heatmap"    icon={Flame}       label="Risk Heatmap" />
          <NavItem to="/classify"   icon={FlaskConical} label="SIF Classifier" />
        </NavGroup>

        {/* ── FIELD ────────────────────────── */}
        <NavGroup label="FIELD">
          <NavItem to="/map"    icon={Map} label="Pan-India Safety Map" />
          <NavItem to="/copilot" icon={Mic} label="Adaptive Interview" />
        </NavGroup>

        {/* ── INVESTIGATION ────────────────── */}
        <NavGroup label="INVESTIGATION">
          <NavItem to="/story" icon={BookOpen} label="Safety Chain Replay" />
        </NavGroup>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.name?.[0] ?? 'H'}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost logout-btn" onClick={onLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <div className="main-wrapper">
        {/* Persistent Convergence Alert Banner */}
        {showBanner && (
          <div className={`convergence-banner ${topZone.severity === 'CRITICAL' ? 'banner-critical' : 'banner-warning'}`}>
            <AlertTriangle size={15} className="banner-icon" />
            <span className="banner-text">
              <strong>BARRIER CONVERGENCE DETECTED</strong>
              {' — '}
              <span className="banner-site">{topZone.site}</span>
              {': '}
              {topZone.degrading_count}/{topZone.total_barriers} protective barriers showing concurrent degradation
              {convergence.length > 1 && ` · ${convergence.length - 1} more site${convergence.length > 2 ? 's' : ''} flagged`}
            </span>
            <button className="banner-view-btn" onClick={() => navigate('/barrier-health')}>
              View Defence Monitor →
            </button>
            <button className="banner-dismiss" onClick={() => setBannerDismissed(true)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        )}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
