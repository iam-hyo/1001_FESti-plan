// # File: src/theme/index.jsx
import React from 'react'
import styled from '@emotion/styled'
import { ThemeProvider, Global, css, useTheme } from '@emotion/react'

export const theme = {
  mode: 'dark',
  colors: {
    background: '#1a1c23',
    surface: '#2a2d35',
    text: '#f0f0f0',
    muted: '#c3c5cc',
    border: '#40434d',
    accent: '#6a5acd',
    accentSoft: 'rgba(106, 90, 205, 0.15)',
    danger: '#ff6b6b',
    success: '#4cd4a8',
    warning: '#ffb65c',
  },
  space: [0,4,8,12,16,20,24,32,40,48,64],
  radii: { xs:6, sm:10, md:14, lg:18, xl:24 },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.35)',
    md: '0 6px 16px rgba(0,0,0,0.35)',
    lg: '0 14px 30px rgba(0,0,0,0.45)',
    glow: '0 0 0 3px rgba(106,90,205,0.25)'
  },
  typography: {
    font: `Inter, Pretendard, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
    size: { xs:12, sm:13, md:14, lg:16, xl:18, h3:22, h2:26, h1:32 },
    weight: { reg:450, med:550, bold:700 }
  },
  layout: { sidebarW:264, headerH:64, container:1280 },
  mq: { sm:'@media (max-width: 640px)', md:'@media (max-width: 900px)', lg:'@media (max-width: 1200px)' },
  transitions: { fast:'120ms ease', base:'200ms ease', slow:'360ms ease' }
}

export const GlobalStyles = () => (
  <Global styles={css`
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body, #root { height: 100%; }
    body {
      margin: 0;
      background: ${theme.colors.background};
      color: ${theme.colors.text};
      font-family: ${theme.typography.font};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    ::selection { background: ${theme.colors.accentSoft}; }
    a { color: ${theme.colors.accent}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `} />
)

export const AppTheme = ({ children }) => (
  <ThemeProvider theme={theme}>
    <GlobalStyles />
    {children}
  </ThemeProvider>
)

const cardBase = (t) => `
  background: ${t.colors.surface};
  border: 1px solid ${t.colors.border};
  border-radius: ${t.radii.lg}px;
  box-shadow: ${t.shadow.sm};
`

export const Shell = styled.div`
  display: grid;
  grid-template-columns: ${({theme:t}) => `${t.layout.sidebarW}px 1fr`};
  grid-template-rows: ${({theme:t}) => `${t.layout.headerH}px 1fr`};
  grid-template-areas:
    'sidebar header'
    'sidebar main';
  min-height: 100vh;
  ${ ({theme:t}) => t.mq.md } {
    grid-template-columns: 1fr;
    grid-template-rows: ${({theme:t}) => `${t.layout.headerH}px auto 1fr`};
    grid-template-areas:
      'header'
      'sidebar'
      'main';
  }
`

export const Sidebar = styled.aside`
  grid-area: sidebar;
  ${ ({theme:t}) => cardBase(t) };
  padding: ${({theme:t}) => t.space[5]}px;
  position: sticky; top: 0; height: 100vh; overflow: auto;
  ${ ({theme:t}) => t.mq.md } { height: auto; position: static; }
`

export const HeaderBar = styled.header`
  grid-area: header; display: flex; align-items: center; justify-content: space-between;
  padding: 0 ${({theme:t}) => t.space[5]}px;
  border-bottom: 1px solid ${({theme:t}) => t.colors.border};
  background: linear-gradient(0deg, rgba(42,45,53,0.85), rgba(42,45,53,0.85));
  backdrop-filter: blur(8px);
  position: sticky; top: 0; z-index: 10;
`

export const Main = styled.main`
  grid-area: main; padding: ${({theme:t}) => t.space[5]}px; max-width: ${({theme:t}) => t.layout.container}px; width: 100%; margin: 0 auto;
`

export const Card = styled.section`
  ${ ({theme:t}) => cardBase(t) }; padding: ${({theme:t}) => t.space[5]}px;
`

export const CardHeader = styled.div`display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;`
export const CardTitle = styled.h3`margin:0; font-size:${({theme:t})=>t.typography.size.h3}px;`

export const Grid = styled.div`
  display: grid; grid-template-columns: repeat(12, 1fr); gap: ${({theme:t}) => t.space[5]}px;
  ${({cols}) => cols && `grid-template-columns: repeat(${cols}, 1fr);`}
  ${({theme:t}) => t.mq.md } { grid-template-columns: 1fr; }
`

export const Badge = styled.span`
  display:inline-flex; align-items:center; gap:8px; padding:4px 10px; border-radius:${({theme:t})=>t.radii.xs}px;
  background:${({theme:t,tone})=> tone==='danger' ? 'rgba(255,107,107,0.15)' : tone==='success' ? 'rgba(76,212,168,0.15)' : t.colors.accentSoft};
  color:${({theme:t,tone})=> tone==='danger' ? '#ff8a8a' : tone==='success' ? '#74e6c6' : t.colors.accent};
  border:1px solid ${({theme:t})=>t.colors.border}; font-size:${({theme:t})=>t.typography.size.sm}px; font-weight:${({theme:t})=>t.typography.weight.med};
`

export const SectionTitle = styled.h2`font-size:${({theme:t})=>t.typography.size.h2}px; margin:0 0 12px;`
export const Divider = styled.hr`border:0; border-top:1px solid ${({theme:t})=>t.colors.border}; margin:24px 0;`


export const ModalBackdrop = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  display: grid; place-items: center; z-index: 50;
`

export const ModalCard = styled.div`
  background: ${({theme:t})=>t.colors.surface};
  border: 1px solid ${({theme:t})=>t.colors.border};
  border-radius: ${({theme:t})=>t.radii.lg}px;
  box-shadow: ${({theme:t})=>t.shadow.lg};
  width: min(760px, 92vw);
  padding: ${({theme:t})=>t.space[5]}px;
`
