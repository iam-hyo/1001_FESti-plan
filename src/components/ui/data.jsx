// # File: src/components/ui/data.jsx
import styled from '@emotion/styled'

export const Stat = styled.div`
  background:${({theme:t})=>t.colors.surface}; border:1px solid ${({theme:t})=>t.colors.border}; border-radius:${({theme:t})=>t.radii.lg}px; box-shadow:${({theme:t})=>t.shadow.sm};
  padding:${({theme:t})=>t.space[5]}px; display:grid; gap:4px;
`
export const StatLabel = styled.div`color:${({theme:t})=>t.colors.muted}; font-size:${({theme:t})=>t.typography.size.sm}px;`
export const StatValue = styled.div`font-size:${({theme:t})=>t.typography.size.h2}px; font-weight:${({theme:t})=>t.typography.weight.bold};`
export const StatDelta = styled.div`font-size:${({theme:t})=>t.typography.size.sm}px; color:${({theme:t,trend})=> trend==='up'? t.colors.success : trend==='down'? t.colors.danger : t.colors.muted};`

export const TableWrap = styled.div`overflow:auto;`
export const Table = styled.table`
  width:100%; border-collapse:separate; border-spacing:0; font-size:${({theme:t})=>t.typography.size.md}px;
  thead th{position:sticky; top:0; z-index:1; background:${({theme:t})=>t.colors.surface}; color:${({theme:t})=>t.colors.muted}; text-align:left; font-weight:${({theme:t})=>t.typography.weight.med}; border-bottom:1px solid ${({theme:t})=>t.colors.border}; padding:10px 12px;}
  tbody td{border-top:1px solid ${({theme:t})=>t.colors.border}; padding:12px;}
  tbody tr:hover td{background:rgba(255,255,255,0.02);}
`



