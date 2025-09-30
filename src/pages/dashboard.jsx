// src/pages/Dashboard.jsx
import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, Grid, SectionTitle, Divider, Badge, ModalBackdrop, ModalCard } from '../theme'
import { Label, Field, Input, Select, Button, SmallInput } from '../components/ui/forms'
import { Stat, StatLabel, StatValue, StatDelta, TableWrap, Table } from '../components/ui/data'
import { ChartCard, ChartBody } from '../components/ui/charts'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import AppShell from '../components/layout/AppShell'
import {
    derivePlaceFeaturesBySelection,
    predictVisitors, sensitivities,
    getProvinces, getDistrictsByProvince,
    goalSeekMinBudget, maximizeOutcomeGivenBudget
} from '../lib/model'
import { RECO_FESTIVALS } from '../data/recoFestivals'

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function Dashboard() {
    // --- Main Tabs in header
    const [mainTab, setMainTab] = useState('predict') // 'predict' | 'opt'

    // --- Region (shared)
    const provinces = useMemo(() => getProvinces(), [])
    const [province, setProvince] = useState('경상남도')
    const [districtList, setDistrictList] = useState([])
    const [district, setDistrict] = useState('창원시')

    useEffect(() => {
        const list = getDistrictsByProvince(province)
        setDistrictList(list)
        if (!list.includes(district)) setDistrict(list[0] || '')
    }, [province])

    // --- Base form for prediction
    const [form, setForm] = useState({
        축제명: '진해군항제',
        시작일: todayISO(),
        종료일: todayISO(),
        개최방식: '오프라인',
        예산_백만원: 500,
        방문객수_전년: 80000,
        관련뉴스수: 12,
        관련블로그수: 350,
        개최월: 4,
        개최계절: '봄',
        예상날씨: '맑음',
        입장료유무: false
    })
    const up = (k, v) => setForm(s => ({ ...s, [k]: v }))

    // --- Place features + KTX override
    const placeBase = useMemo(() => derivePlaceFeaturesBySelection(province, district), [province, district])
    const [placeOverride, setPlaceOverride] = useState({ useAutoKTX: true, ktx: false })
    const ktxValue = placeOverride.useAutoKTX ? placeBase.ktx : placeOverride.ktx

    // --- Date & days + future check
    const startDate = new Date(form.시작일)
    const endDate = new Date(form.종료일)
    const now = new Date()
    const isFuture = startDate > now && endDate > now
    const totalDays = useMemo(() => {
        return Math.max(1, Math.ceil((endDate - startDate) / (1000 * 3600 * 24)) + 1)
    }, [form.시작일, form.종료일])

    // --- Prediction input
    const baseInput = {
        totalDays,
        budget: form.예산_백만원,
        lastYearVisitors: form.방문객수_전년,
        newsCount: form.관련뉴스수,
        blogCount: form.관련블로그수,
        month: Number(form.개최월),
        weather: form.예상날씨,
        ktx: ktxValue,
        ticketed: form.입장료유무,
        cityPop: placeBase.cityPop,
        seoulMinutes: placeBase.travelMin,
        season: form.개최계절,
    }

    const pred = useMemo(() => predictVisitors(baseInput), [JSON.stringify(baseInput)])
    const sens = useMemo(() => sensitivities(baseInput, Math.max(1, pred.mean)), [JSON.stringify(baseInput), pred.mean])

    // Sensitivity explanation (top positive / top negative)
    const topPos = useMemo(() => {
        const byAbs = [...sens].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        const candidates = byAbs.filter(d => d.value >= 0)
        return candidates[0] || null
    }, [sens])
    const topNeg = useMemo(() => {
        const byAbs = [...sens].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        const candidates = byAbs.filter(d => d.value < 0)
        return candidates[0] || null
    }, [sens])

    // --- Optimization
    const [optTab, setOptTab] = useState('goal') // 'goal' | 'max'
    const [locks, setLocks] = useState({ festivalType: null, totalDays: null, ticketed: null })
    const [proxy, setProxy] = useState({ newsPer10: 100, blogPer100: 500, perDay: 2000 })
    const [targetVisitors, setTargetVisitors] = useState(120000)
    const [budgetCap, setBudgetCap] = useState(1000) // 백만원
    const [goalResult, setGoalResult] = useState(null)
    const [maxResult, setMaxResult] = useState(null)
    const [proxyMode, setProxyMode] = useState('none') // Goal Seek 기본: 비용 불필요


    const runGoalSeek = () => {
        const base = { ...baseInput }
        // Goal Seek은 비용 정보 없어도 동작 → 'none' 선택 시 proxy=0으로 처리
        const proxyForRun = proxyMode === 'none' ? { newsPer10: 0, blogPer100: 0, perDay: 0 } : proxy
        const res = goalSeekMinBudget(base, { locks, proxyCost: proxyForRun, province, city: district, targetVisitors })(base, { locks, proxyCost: proxy, province, city: district, targetVisitors })
        setGoalResult(res)
    }
    const runMaximize = () => {
        const base = { ...baseInput }
        const proxyForRun = proxyMode === 'none' ? { newsPer10: 0, blogPer100: 0, perDay: 0 } : proxy
        const res = maximizeOutcomeGivenBudget(base, { locks, proxyCost: proxyForRun, province, city: district, budgetCap })
        setMaxResult(res)
    }
    // 탭 전환시 기본 모드: Goal → none / Max → use
    useEffect(() => {
        setProxyMode(optTab === 'goal' ? 'none' : 'use')
    }, [optTab])

    // --- Sidebar recommendations modal
    const [modalItem, setModalItem] = useState(null)

    return (
        <AppShell
            headerRight={
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant={mainTab === 'predict' ? '' : 'ghost'} onClick={() => setMainTab('predict')}>방문객수 예측센터</Button>
                    <Button variant={mainTab === 'opt' ? '' : 'ghost'} onClick={() => setMainTab('opt')}>최적화 시뮬레이터</Button>
                </div>
            }
            sidebar={
                <SidebarContent
                    province={province} setProvince={setProvince}
                    district={district} setDistrict={setDistrict}
                    setModalItem={setModalItem}
                />
            }
        >
            {/* <SectionTitle>FestiPlan</SectionTitle> */}

            {/* Top row: 예상 방문객 / 일자 / 예산 */}
            <Grid>
                <div style={{ gridColumn: 'span 4' }}>
                    <Stat>
                        <StatLabel>예상 방문객</StatLabel>
                        <StatValue>{pred.mean.toLocaleString()} 명</StatValue>
                        <StatDelta trend="up">90% 구간 {pred.low.toLocaleString()} ~ {pred.high.toLocaleString()}</StatDelta>
                    </Stat>
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                    <Stat>
                        <StatLabel>일자(총일수)</StatLabel>
                        <StatValue>{totalDays} 일</StatValue>
                        {!isFuture && <Badge tone="danger">미래 날짜가 아닙니다</Badge>}
                    </Stat>
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                    <Stat>
                        <StatLabel>예산</StatLabel>
                        <StatValue>{form.예산_백만원.toLocaleString()} 백만원</StatValue>
                    </Stat>
                </div>
            </Grid>

            <Divider />

            {mainTab === 'predict' ? (
                <>
                    {/* Basic info (wide) with place-derived block inside */}
                    <Card>
                        <CardHeader><CardTitle>기본 정보 입력</CardTitle></CardHeader>

                        <Grid>
                            <div style={{ gridColumn: 'span 6' }}>
                                <Field>
                                    <Label>광역/기초 자치단체</Label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <Select value={province} onChange={e => setProvince(e.target.value)}>
                                            {provinces.map(p => <option key={p}>{p}</option>)}
                                        </Select>
                                        <Select value={district} onChange={e => setDistrict(e.target.value)}>
                                            {districtList.map(d => <option key={d}>{d}</option>)}
                                        </Select>
                                    </div>
                                </Field>

                                <Field>
                                    <Label>축제명</Label>
                                    <Input value={form.축제명} onChange={(e) => up('축제명', e.target.value)} />
                                </Field>

                                <Field>
                                    <Label>기간</Label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <Input type="date" value={form.시작일} onChange={e => up('시작일', e.target.value)} />
                                        <Input type="date" value={form.종료일} onChange={e => up('종료일', e.target.value)} />
                                    </div>
                                </Field>

                                <Field>
                                    <Label>개최 월 / 계절 / 예상 날씨</Label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                        <Input type="number" min={1} max={12} value={form.개최월} onChange={e => up('개최월', Number(e.target.value))} />
                                        <Select value={form.개최계절} onChange={e => up('개최계절', e.target.value)}>
                                            {['봄', '여름', '가을', '겨울'].map(s => <option key={s}>{s}</option>)}
                                        </Select>
                                        <Select value={form.예상날씨} onChange={e => up('예상날씨', e.target.value)}>
                                            {['맑음', '흐림', '비', '폭우'].map(s => <option key={s}>{s}</option>)}
                                        </Select>
                                    </div>
                                </Field>

                                <Field>
                                    <Label>예산(백만원) / 전년 방문객 / 뉴스 / 블로그</Label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                        <Input type="number" value={form.예산_백만원} onChange={e => up('예산_백만원', Number(e.target.value))} />
                                        <Input type="number" value={form.방문객수_전년} onChange={e => up('방문객수_전년', Number(e.target.value))} />
                                        <Input type="number" value={form.관련뉴스수} onChange={e => up('관련뉴스수', Number(e.target.value))} />
                                        <Input type="number" value={form.관련블로그수} onChange={e => up('관련블로그수', Number(e.target.value))} />
                                    </div>
                                </Field>

                                <Field>
                                    <Label>입장료 유무</Label>
                                    <Select value={String(form.입장료유무)} onChange={e => up('입장료유무', e.target.value === 'true')}>
                                        <option value="false">무료</option>
                                        <option value="true">유료</option>
                                    </Select>
                                </Field>
                            </div>

                            {/* Place-derived auto values (no description), KTX editable */}
                            <div style={{ gridColumn: 'span 6' }}>
                                <Card>
                                    <CardHeader><CardTitle>장소 기반 자동값</CardTitle></CardHeader>
                                    <TableWrap>
                                        <Table>
                                            <thead><tr><th>항목</th><th>값</th></tr></thead>
                                            <tbody>
                                                <tr>
                                                    <td>KTX</td>
                                                    <td>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                            <Select
                                                                value={placeOverride.useAutoKTX ? 'auto' : 'manual'}
                                                                onChange={e => {
                                                                    const mode = e.target.value
                                                                    setPlaceOverride(s => ({
                                                                        ...s,
                                                                        useAutoKTX: mode === 'auto',
                                                                        ktx: mode === 'auto' ? s.ktx : (s.ktx ?? false)
                                                                    }))
                                                                }}
                                                            >
                                                                <option value="auto">자동</option>
                                                                <option value="manual">수동</option>
                                                            </Select>
                                                            <Select
                                                                disabled={placeOverride.useAutoKTX}
                                                                value={String(placeOverride.useAutoKTX ? placeBase.ktx : placeOverride.ktx)}
                                                                onChange={e => setPlaceOverride(s => ({ ...s, ktx: e.target.value === 'true' }))}
                                                            >
                                                                <option value="true">있음</option>
                                                                <option value="false">없음</option>
                                                            </Select>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr><td>시 인구수</td><td>{placeBase.cityPop.toLocaleString()}</td></tr>
                                                <tr><td>서울편도(분)</td><td>{placeBase.travelMin}</td></tr>
                                            </tbody>
                                        </Table>
                                    </TableWrap>
                                </Card>
                            </div>
                        </Grid>
                    </Card>

                    <Divider />

                    <Grid>
                        <div style={{ gridColumn: 'span 7' }}>
                            <ChartCard>
                                <CardHeader><CardTitle>민감도 분석</CardTitle><Badge>탄력도 유사 지표</Badge></CardHeader>
                                <ChartBody>
                                    <ResponsiveContainer>
                                        <BarChart data={sens} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                                            <XAxis type="number" domain={[Math.min(-0.5, ...sens.map(d => d.value)), Math.max(0.5, ...sens.map(d => d.value))]} tickFormatter={(v) => v.toFixed(2)} />
                                            <YAxis type="category" dataKey="name" width={110} />
                                            <Tooltip
                                                labelStyle={{ color: '#f0f0f0' }}
                                                itemStyle={{ color: '#6a5acd' }}
                                                contentStyle={{ backgroundColor: '#2a2d35', borderRadius: 8, border: '1px solid #40434d' }}
                                                formatter={(v) => Number(v).toFixed(3)}
                                            />
                                            <ReferenceLine x={0} />
                                            <Bar dataKey="value" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartBody>
                            </ChartCard>
                        </div>
                        <div style={{ gridColumn: 'span 5' }}>
                            <Card>
                                <CardHeader><CardTitle>변수 해석</CardTitle></CardHeader>
                                <div style={{ opacity: 0.85, lineHeight: 1.8 }}>
                                    <p>• <b>민감도 값이 음수</b>인 경우: 해당 변수가 증가할수록 방문객 예측값이 <b>감소</b>하는 경향입니다. (예: 유료 입장, 이동시간 증가 등)</p>
                                    <Divider />
                                    <p>
                                        • 가장 크게 <b>증가 방향</b>으로 작용한 변수: <b>{topPos?.name ?? '—'}</b><br />
                                        → 이 변수는 소폭 증가에도 방문객 증가에 상대적으로 큰 기여를 합니다. 우선 투자/개선을 고려하세요.
                                    </p>
                                    <p>
                                        • 가장 크게 <b>감소 방향</b>으로 작용한 변수: <b>{topNeg?.name ?? '—'}</b><br />
                                        → 이 변수는 증가 시 방문객 감소에 기여할 수 있습니다. 유지/완화 또는 대체 전략을 검토하세요.
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </Grid>
                </>
            ) : (
                <>
                    {/* Optimization Simulator */}
                    <Card>
                        <CardHeader>
                            <CardTitle>설정</CardTitle>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button variant={optTab === 'goal' ? '' : 'ghost'} onClick={() => setOptTab('goal')}>Goal Seek</Button>
                                <Button variant={optTab === 'max' ? '' : 'ghost'} onClick={() => setOptTab('max')}>Maximize</Button>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                                {optTab === 'goal'
                                    ? 'Goal Seek: 목표 방문객 수를 달성하는 조건 중 총비용(예산+Proxy)을 최소화합니다.'
                                    : 'Maximize: 주어진 총비용 한도 내에서 예상 방문객 수를 최대화합니다.'}
                            </div>
                        </CardHeader>

                        <Grid>
                            <div style={{ gridColumn: 'span 6' }}>
                                <Field>
                                    <Label>지역 설정 (최적화에 반영)</Label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>광역자치구</div>
                                            <Select value={province} onChange={e => setProvince(e.target.value)}>
                                                {provinces.map(p => <option key={p}>{p}</option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>기초자치구</div>
                                            <Select value={district} onChange={e => setDistrict(e.target.value)}>
                                                {districtList.map(d => <option key={d}>{d}</option>)}
                                            </Select>
                                        </div>
                                    </div>
                                </Field>

                                <Field>
                                    <Label>변수 Lock</Label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>축제유형</div>
                                            <Select value={locks.festivalType ?? ''} onChange={e => setLocks(s => ({ ...s, festivalType: e.target.value || null }))}>
                                                <option value="">(자유)</option>
                                                {['문화예술', '음악', '전통', '푸드', '기타'].map(v => <option key={v}>{v}</option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>축제 기간</div>
                                            <Select value={locks.totalDays ?? ''} onChange={e => setLocks(s => ({ ...s, totalDays: e.target.value ? Number(e.target.value) : null }))}>
                                                <option value="">(자유)</option>
                                                {[2, 3, 4, 5, 6].map(v => <option key={v} value={v}>{v}일</option>)}
                                            </Select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>입장료 유무</div>
                                            <Select value={locks.ticketed ?? ''} onChange={e => setLocks(s => ({ ...s, ticketed: e.target.value === '' ? null : (e.target.value === 'true') }))}>
                                                <option value="">(자유)</option>
                                                <option value="false">무료</option>
                                                <option value="true">유료</option>
                                            </Select>
                                        </div>
                                    </div>
                                </Field>

                                <Field>
                                    <Label>Proxy 비용 단가(백만원)</Label>
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input
                                                type="radio"
                                                name="proxyMode"
                                                checked={proxyMode === 'use'}
                                                onChange={() => setProxyMode('use')}
                                            />
                                            입력함(권장)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input
                                                type="radio"
                                                name="proxyMode"
                                                checked={proxyMode === 'none'}
                                                onChange={() => setProxyMode('none')}
                                            />
                                            입력 안함
                                        </label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, opacity: proxyMode === 'none' ? 0.45 : 1 }}>
                                        <SmallInput type="number" value={proxy.newsPer10} onChange={e => setProxy(p => ({ ...p, newsPer10: Number(e.target.value) }))} placeholder="뉴스 10개당" disabled={proxyMode === 'none'} />
                                        <SmallInput type="number" value={proxy.blogPer100} onChange={e => setProxy(p => ({ ...p, blogPer100: Number(e.target.value) }))} placeholder="블로그 100개당" disabled={proxyMode === 'none'} />
                                        <SmallInput type="number" value={proxy.perDay} onChange={e => setProxy(p => ({ ...p, perDay: Number(e.target.value) }))} placeholder="1일 연장당" disabled={proxyMode === 'none'} />
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                                        ※ Proxy 비용은 모델이 모르는 증분비용의 <b>근사 단가</b>입니다. 예) 뉴스 10개 확보 비용, 블로그 100개 확보 비용, 축제 1일 연장 비용 등.<br />
                                        {optTab === 'goal'
                                            ? 'Goal Seek은 비용 정보 없이도 수행 가능합니다.'
                                            : 'Maximize는 비용 정보를 입력하면 더 현실적인 추천이 가능합니다.'}
                                        {proxyMode === 'none' && (
                                            <span style={{ display: 'inline-block', marginLeft: 6 }}>
                                                (입력 안함 선택 시, 비용 불확실성으로 인해 결과 해석의 <b>신뢰구간이 넓어질 수 있음</b>)
                                            </span>
                                        )}
                                    </div>
                                </Field>
                            </div>

                            <div style={{ gridColumn: 'span 6' }}>
                                {optTab === 'goal' ? (
                                    <>
                                        <Field>
                                            <Label>목표 방문객 수</Label>
                                            <Input type="number" value={targetVisitors} onChange={e => setTargetVisitors(Number(e.target.value))} />
                                        </Field>
                                        <Button onClick={runGoalSeek}>Goal Seek 실행</Button>
                                    </>
                                ) : (
                                    <>
                                        <Field>
                                            <Label>예산 한도(백만원, Proxy비용 포함)</Label>
                                            <Input type="number" value={budgetCap} onChange={e => setBudgetCap(Number(e.target.value))} />
                                        </Field>
                                        <Button onClick={runMaximize}>Maximize 실행</Button>
                                    </>
                                )}
                            </div>
                        </Grid>
                    </Card>

                    <Divider />

                    <Grid>
                        <div style={{ gridColumn: 'span 12', display: 'flex', gap: '24px' }}>

                            <Card>
                                <CardHeader><CardTitle>추천 결과</CardTitle></CardHeader>
                                <TableWrap>
                                    <Table>
                                        <thead><tr><th>항목</th><th>값</th></tr></thead>
                                        <tbody>
                                            {(optTab === 'goal' ? goalResult : maxResult) ? (
                                                <>
                                                    <tr><td>예상 방문객</td><td>{(optTab === 'goal' ? goalResult.visitors : maxResult.visitors).toLocaleString()} 명</td></tr>
                                                    <tr><td>90% 구간</td><td>
                                                        {(optTab === 'goal' ? goalResult.low : maxResult.low).toLocaleString()} ~ {(optTab === 'goal' ? goalResult.high : maxResult.high).toLocaleString()}
                                                    </td></tr>
                                                    {proxyMode === 'none' && (
                                                        <tr>
                                                            <td>주의</td>
                                                            <td style={{ opacity: 0.85 }}>Proxy 비용 미사용으로 비용 불확실성이 커져 <b>신뢰구간 해석에 주의</b>가 필요합니다.</td>
                                                        </tr>
                                                    )}
                                                    <tr><td>총일수</td><td>{(optTab === 'goal' ? goalResult.totalDays : maxResult.totalDays)} 일</td></tr>
                                                    <tr><td>예산(백만원)</td><td>{(optTab === 'goal' ? goalResult.budget : maxResult.budget).toLocaleString()}</td></tr>
                                                    <tr><td>뉴스/블로그</td><td>
                                                        뉴스 {(optTab === 'goal' ? goalResult.newsCount : maxResult.newsCount)} · 블로그 {(optTab === 'goal' ? goalResult.blogCount : maxResult.blogCount)}
                                                    </td></tr>
                                                    <tr><td>입장료</td><td>{(optTab === 'goal' ? goalResult.ticketed : maxResult.ticketed) ? '유료' : '무료'}</td></tr>
                                                    <tr><td>총비용(근사)</td><td>{(optTab === 'goal' ? goalResult.totalCost : maxResult.totalCost).toLocaleString()} (백만원)</td></tr>
                                                </>
                                            ) : (
                                                <tr><td colSpan={2} style={{ opacity: 0.7 }}>아직 결과가 없습니다. 상단에서 실행하세요.</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </TableWrap>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>수리적 해설</CardTitle></CardHeader>
                                <div style={{ lineHeight: 1.7, fontSize: 14, opacity: 0.9 }}>
                                    <div><b>Goal Seek</b>:  최소화 <code>min (예산 + Proxy)</code> subject to <code>ŷ(x) ≥ 목표 방문객</code></div>
                                    <div><b>Maximize</b>:  최대화 <code>max ŷ(x)</code> subject to <code>(예산 + Proxy) ≤ 예산 한도</code></div>
                                    <div>여기서 <code>ŷ(x)</code>는 입력 변수 <code>x</code>에 대한 예측 방문객 수(선형 모형 + 잡음)입니다.</div>
                                </div>
                            </Card>
                        </div>
                    </Grid>
                </>
            )}

            {/* Modal for sidebar recommendation */}
            {modalItem && (
                <ModalBackdrop onClick={() => setModalItem(null)}>
                    <ModalCard onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
                            <img
                                src={`/assets/image${((modalItem.imgIdx || 1))}.jpg`}
                                alt={modalItem.name}
                                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, border: '1px solid #40434d' }}
                            />
                            <div>
                                <h3 style={{ margin: '0 0 8px' }}>{modalItem.name}</h3>
                                <div style={{ opacity: 0.8, marginBottom: 8 }}>
                                    {modalItem.province} {modalItem.city} · {modalItem.type} · {modalItem.mode}
                                </div>
                                <div style={{ lineHeight: 1.8 }}>
                                    <div><b>일시</b> {modalItem.start} ~ {modalItem.end} ({modalItem.days}일)</div>
                                    <div><b>장소</b> {modalItem.place}</div>
                                    <div><b>예산</b> {modalItem.budgetMm?.toLocaleString()} 백만원</div>
                                    <div><b>전년 방문객</b> {modalItem.lastYearVisitors?.toLocaleString()}</div>
                                    <div><b>당년 방문객</b> {modalItem.visitors?.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button variant="ghost" onClick={() => setModalItem(null)}>닫기</Button>
                        </div>
                    </ModalCard>
                </ModalBackdrop>
            )}
        </AppShell>
    )
}

/* ---------------- Sidebar with Recommendations ---------------- */
function SidebarContent({ province, setProvince, district, setDistrict, setModalItem }) {
    const provinces = useMemo(() => getProvinces(), [])
    const dlist = useMemo(() => getDistrictsByProvince(province), [province])
    const picks = useMemo(() => {
        // pick random 5 from RECO_FESTIVALS; tie render to region to reshuffle on change if desired
        const arr = [...RECO_FESTIVALS]
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr.slice(0, 5).map((x) => ({ ...x, imgIdx: (Math.floor(Math.random() * 5) + 1) }))
    }, [province, district])

    return (
        <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
            <div style={{ marginBottom: 10, opacity: 0.8, fontSize: 13 }}>행정구역 선택</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 16 }}>
                <Select value={province} onChange={e => setProvince(e.target.value)}>
                    {provinces.map(p => <option key={p}>{p}</option>)}
                </Select>
                <Select value={district} onChange={e => setDistrict(e.target.value)}>
                    {dlist.map(d => <option key={d}>{d}</option>)}
                </Select>
            </div>

            <div style={{ margin: '12px 0 8px', fontSize: 13, opacity: 0.85, fontWeight: 600 }}>유사 축제 Top5</div>
            <div style={{ display: 'grid', gap: 8 }}>
                {picks.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setModalItem(item)}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '64px 1fr',
                            gap: 10,
                            textAlign: 'left',
                            background: 'transparent',
                            border: '1px solid #40434d',
                            borderRadius: 12,
                            padding: 8,
                            cursor: 'pointer',
                            minWidth: 0
                        }}
                    >
                        <img
                            src={`/assets/image${item.imgIdx}.jpg`}
                            alt={item.name}
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #40434d' }}
                        />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4, fontWeight: 600 }}>
                                {item.name}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                예산 {item.budgetMm?.toLocaleString()}백만 · {item.start}~{item.end}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                전년 {item.lastYearVisitors?.toLocaleString()}명
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
