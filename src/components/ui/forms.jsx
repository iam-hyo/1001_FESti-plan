// # File: src/components/ui/forms.jsx
import styled from '@emotion/styled'

const focusRing = (t) => `outline:none; box-shadow:${t.shadow.glow};`
const inputChrome = (t) => `
  width:100%; height:38px; padding:0 12px; background:${t.colors.background}; color:${t.colors.text};
  border:1px solid ${t.colors.border}; border-radius:${t.radii.sm}px; transition:border ${t.transitions.base}, box-shadow ${t.transitions.base};
  &::placeholder{color:${t.colors.muted};} &:hover{border-color:${t.colors.accent};} &:focus{${focusRing(t)} border-color:${t.colors.accent};}
`

export const Label = styled.label`display:block; margin-bottom:6px; color:${({theme:t})=>t.colors.muted}; font-size:${({theme:t})=>t.typography.size.sm}px;`
export const Field = styled.div`display:grid; gap:8px; margin-bottom:16px;`
export const Input = styled.input`${({theme:t})=>inputChrome(t)}`
export const Select = styled.select`
  ${({theme:t})=>inputChrome(t)}; appearance:none;
  background-image: linear-gradient(45deg, transparent 50%, ${'#c3c5cc'} 50%), linear-gradient(135deg, ${'#c3c5cc'} 50%, transparent 50%);
  background-position: calc(100% - 18px) 16px, calc(100% - 12px) 16px; background-size: 6px 6px, 6px 6px; background-repeat: no-repeat;
`
export const Textarea = styled.textarea`${({theme:t})=>inputChrome(t)}; height:96px; padding:10px 12px; resize:vertical;`

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-radius: ${({ theme: t }) => t.radii.sm}px;
  cursor: pointer;
  font-weight: ${({ theme: t }) => t.typography.weight.med};
  transition: transform ${({ theme: t }) => t.transitions.fast}, filter ${({ theme: t }) => t.transitions.fast};

  // 상태 변화
  &:hover {
    filter: brightness(1.05);
  }
  &:active {
    transform: translateY(1px);
  }
  &:focus {
    ${({ theme: t }) => focusRing(t)}
  }

  // Variants
  border: 1px solid ${({ theme: t, variant }) => variant === 'ghost' ? t.colors.border : 'transparent'};
  color: ${({ theme: t, variant }) => variant === 'ghost' ? t.colors.text : '#fff'};
  background: ${({ theme: t, tone }) => t.colors.accent};
  
  ${({ variant, theme: t }) => variant === 'ghost' && `
    background: transparent;
  `}
`;

export const CheckboxRow = styled.label`
  display:flex; align-items:center; gap:10px; font-size:${({theme:t})=>t.typography.size.md}px;
  input { width:16px; height:16px; }
`

export const SmallInput = styled.input`
  ${({theme:t})=>inputChrome(t)}; height:32px; padding:0 10px; font-size:${({theme:t})=>t.typography.size.sm}px;
`