// # File: src/components/layout/AppShell.jsx
import React from 'react'
import { Shell, Sidebar, HeaderBar, Main, Badge } from '../../theme'

const AppShell = ({ sidebar, headerRight, children }) => (
  <Shell>
    <Sidebar>{sidebar}</Sidebar>
    <HeaderBar>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Badge>FestiPlan</Badge>
        <span style={{ opacity:0.7 }}>데이터 기반 축제 의사결정</span>
      </div>
      <div>{headerRight}</div>
    </HeaderBar>
    <Main>{children}</Main>
  </Shell>
)
export default AppShell
