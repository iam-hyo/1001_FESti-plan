// src/lib/model.js
import districts from '../assets/korea-administrative-district.json'

// --- Random utils ---
function randn(mean=0, std=1){
  let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random();
  return mean + std*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)
}
const clamp = (n,a,b)=> Math.max(a, Math.min(b,n))

// --- Admin helpers ---
export function getProvinces() {
  // districts.data = [{ "서울특별시": [ ... ] }, { "부산광역시": [...] }, ...]
  return districts.data.map(obj => Object.keys(obj)[0])
}

export function getDistrictsByProvince(province) {
  const found = districts.data.find(obj => Object.keys(obj)[0] === province)
  if (!found) return []
  return found[province] || []
}

// --- Coefficients for mock linear model ---
const COEF = {
  intercept: 5000,
  totalDays: 400,
  budget: 60,
  lastYear: 0.35,
  news: 120,
  blog: 18,
  month: 350,
  weather: -1200,
  ktx: 8000,
  ticket: -3000,
  cityPop: 0.004,
  seoulMin: -12,
  season: [2000, 2800, 3500, 500],
}
const seasons = ['봄','여름','가을','겨울']
const weatherMap = {'맑음':0,'흐림':1,'비':2,'폭우':3}

// --- Place derivation (province/city aware) ---
const PROVINCE_DEFAULTS = {
  '서울특별시': { cityPop: 9500000, ktx: 1, seoulMin: 15 },
  '부산광역시': { cityPop: 3300000, ktx: 1, seoulMin: 210 },
  '대구광역시': { cityPop: 2300000, ktx: 1, seoulMin: 140 },
  '대전광역시': { cityPop: 1500000, ktx: 1, seoulMin: 90 },
  '광주광역시': { cityPop: 1450000, ktx: 0, seoulMin: 190 },
  '제주특별자치도': { cityPop: 700000, ktx: 0, seoulMin: 70 },
}

export function derivePlaceFeaturesBySelection(province, city) {
  const base = PROVINCE_DEFAULTS[province] || { cityPop: 300000, ktx: 0, seoulMin: 180 }
  // (선택한 시/군/구에 따라 미세 보정할 수 있음; 목업에서는 base만 사용)
  return {
    cityPop: base.cityPop,
    ktx: Boolean(base.ktx),
    travelMin: base.seoulMin,
  }
}

// --- Prediction (mock linear) ---
export function predictVisitors(input){
  const seasonIdx = Math.max(0, seasons.indexOf(input.season))
  const seasonEff = COEF.season[seasonIdx] || 0
  const w = weatherMap[input.weather] ?? 1
  const lp = COEF.intercept
    + COEF.totalDays * input.totalDays
    + COEF.budget * input.budget
    + COEF.lastYear * input.lastYearVisitors
    + COEF.news * input.newsCount
    + COEF.blog * input.blogCount
    + COEF.month * input.month
    + COEF.weather * w
    + COEF.ktx * (input.ktx?1:0)
    + COEF.ticket * (input.ticketed?1:0)
    + COEF.cityPop * input.cityPop
    + COEF.seoulMin * input.seoulMinutes
    + seasonEff
  const noise = randn(0, Math.sqrt(Math.max(1, lp))*0.2)
  const mean = Math.max(0, lp + noise)
  const std = Math.sqrt(mean) * 0.25
  const low = clamp(Math.round(mean - 1.64*std), 0, Infinity)
  const high = clamp(Math.round(mean + 1.64*std), 0, Infinity)
  return { mean: Math.round(mean), low, high }
}

// --- Sensitivity (elasticity-like) ---
export function sensitivities(input, yhat){
  const items=[]
  const push=(name,coef,x)=> items.push({ name, value:+((coef*x)/Math.max(1,yhat)).toFixed(3) })
  push('총일수', COEF.totalDays, input.totalDays)
  push('예산(백만원)', COEF.budget, input.budget)
  push('전년 방문객', COEF.lastYear, input.lastYearVisitors)
  push('뉴스 수', COEF.news, input.newsCount)
  push('블로그 수', COEF.blog, input.blogCount)
  push('개최 월', COEF.month, input.month)
  push('날씨 지수', COEF.weather, (weatherMap[input.weather]??1))
  push('KTX', COEF.ktx, input.ktx?1:0)
  push('유료 입장', COEF.ticket, input.ticketed?1:0)
  push('시 인구수', COEF.cityPop, input.cityPop)
  push('서울편도시간(분)', COEF.seoulMin, input.seoulMinutes)
  const seasonIdx = Math.max(0, seasons.indexOf(input.season))
  const seasonEff = COEF.season[seasonIdx]||0
  items.push({ name:'계절(효과)', value:+(seasonEff/Math.max(1,yhat)).toFixed(3) })
  return items.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,10)
}

// --- Scenario & Heuristic Search (mock) ---
const VAR_ENUMS = {
  festivalType: ['문화예술','음악','전통','푸드','기타'],
  ticketed: [false, true],
  weather: ['맑음','흐림','비'],
  season: ['봄','여름','가을','겨울'],
}
const GRID = {
  totalDays: [2,3,4,5,6,7],
  newsCount: [10,20,30,40,50,60,80,100],
  blogCount: [100,200,300,400,500,700,1000],
  budget: steps(50, 3000, 50), // 0.5억~30억
}
function steps(start, end, step) {
  const arr=[]; for (let v=start; v<=end; v+=step) arr.push(v); return arr;
}

// Proxy cost: user defined unit costs (목업)
export function computeProxyCost({newsCount, blogCount, totalDays}, proxy) {
  const cNews = (proxy?.newsPer10 || 100) * (newsCount/10)   // 예: 뉴스 10개당 100만원
  const cBlog = (proxy?.blogPer100 || 500) * (blogCount/100) // 예: 블로그 100개당 500만원
  const cDays = (proxy?.perDay || 2000) * Math.max(0, totalDays-3) // 3일 초과분만 가정 비용
  return cNews + cBlog + cDays // (백만원 단위로 반환)
}

// 시나리오 후보 생성 (lock/범위/랜덤 일부 혼합)
export function generateScenarios(base, locks={}, ranges={}, sampleN=3000) {
  const pick = (key, grid) => {
    if (locks[key] !== undefined && locks[key] !== null) return [locks[key]]
    if (ranges[key] && Array.isArray(ranges[key])) return ranges[key]
    return grid
  }

  const days = pick('totalDays', GRID.totalDays)
  const news = pick('newsCount', GRID.newsCount)
  const blog = pick('blogCount', GRID.blogCount)
  const budget = pick('budget', GRID.budget)
  const w = pick('weather', VAR_ENUMS.weather)
  const s = pick('season', VAR_ENUMS.season)
  const ticket = pick('ticketed', VAR_ENUMS.ticketed)
  const ftype = pick('festivalType', VAR_ENUMS.festivalType)

  const candidates=[]
  // 간단 샘플링: 균일 격자 일부 + 랜덤 섞기
  for (let i=0; i<sampleN; i++){
    candidates.push({
      totalDays: sampleOf(days),
      newsCount: sampleOf(news),
      blogCount: sampleOf(blog),
      budget: sampleOf(budget),
      weather: sampleOf(w),
      season: sampleOf(s),
      ticketed: sampleOf(ticket),
      festivalType: sampleOf(ftype),
    })
  }
  return candidates
}
function sampleOf(arr){ return arr[Math.floor(Math.random()*arr.length)] }

// Goal Seek: 목표 방문객 이상 중 최소 비용(총비용 = 예산 + Proxy)
export function goalSeekMinBudget(base, opts) {
  const { locks, ranges, proxyCost, province, city } = opts
  const scen = generateScenarios(base, locks, ranges, 4000)
  let best = null
  for (const x of scen) {
    const place = derivePlaceFeaturesBySelection(province, city)
    const pred = predictVisitors({
      ...base,
      ...x,
      month: base.month,
      ktx: place.ktx,
      cityPop: place.cityPop,
      seoulMinutes: place.travelMin,
    })
    if (pred.mean >= (opts.targetVisitors || 100000)) {
      const cProxy = computeProxyCost(x, proxyCost)
      const totalCost = x.budget + cProxy
      if (!best || totalCost < best.totalCost) {
        best = { ...x, visitors: pred.mean, low: pred.low, high: pred.high, totalCost }
      }
    }
  }
  return best
}

// Maximize Outcome: 주어진 예산 한도 내 최대 방문객
export function maximizeOutcomeGivenBudget(base, opts) {
  const { locks, ranges, proxyCost, province, city } = opts
  const scen = generateScenarios(base, locks, ranges, 4000)
  let best = null
  for (const x of scen) {
    const cProxy = computeProxyCost(x, proxyCost)
    const totalCost = x.budget + cProxy
    if (totalCost <= (opts.budgetCap || 1000)) {
      const place = derivePlaceFeaturesBySelection(province, city)
      const pred = predictVisitors({
        ...base,
        ...x,
        month: base.month,
        ktx: place.ktx,
        cityPop: place.cityPop,
        seoulMinutes: place.travelMin,
      })
      if (!best || pred.mean > best.visitors) {
        best = { ...x, visitors: pred.mean, low: pred.low, high: pred.high, totalCost }
      }
    }
  }
  return best
}
