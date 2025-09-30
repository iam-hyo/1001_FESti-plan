// # File: src/components/ui/charts.jsx
import styled from '@emotion/styled'
export const ChartCard = styled.section`
  background:${({theme:t})=>t.colors.surface}; border:1px solid ${({theme:t})=>t.colors.border}; border-radius:${({theme:t})=>t.radii.lg}px; box-shadow:${({theme:t})=>t.shadow.sm};
  padding:${({theme:t})=>t.space[5]}px; height:360px; display:flex; flex-direction:column;
`
export const ChartBody = styled.div`flex:1; min-height:220px;`
