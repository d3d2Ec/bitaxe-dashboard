import { useState, useEffect, useRef } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts"

// ── Crew config ───────────────────────────────────────────────────────────────
const CREW = [
  { id: "carbon",  name: "Carbon",  devices: 2, color: "#f7931a", you: true  },
  { id: "neon",    name: "Neon",    devices: 2, color: "#58a6ff", you: false },
  { id: "argon",   name: "Argon",   devices: 2, color: "#3fb950", you: false },
]

const BLOCK_REWARD_USD = 300000
const TAX_RATE = 0.20
const API = "/api"

// ── Utility ───────────────────────────────────────────────────────────────────
function calcPayouts(crew, newMembers = []) {
  const origDevices = crew.reduce((s, m) => s + m.devices, 0)
  const newDevices  = newMembers.reduce((s, m) => s + m.devices, 0)
  const total       = origDevices + newDevices
  const origShare   = (origDevices / total) * BLOCK_REWARD_USD
  const newShare    = (newDevices  / total) * BLOCK_REWARD_USD
  const taxPool     = newShare * TAX_RATE
  const origEach    = (origShare + taxPool) / crew.length
  return { origEach, newShare: newShare * (1 - TAX_RATE), total }
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ value, prefix = "", suffix = "", decimals = 2, color = "#f7931a" }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const end   = parseFloat(value) || 0
    if (start === end) return
    const dur = 800, steps = 40
    let i = 0
    const t = setInterval(() => {
      i++
      setDisplay(start + (end - start) * (i / steps))
      if (i >= steps) { clearInterval(t); prev.current = end }
    }, dur / steps)
    return () => clearInterval(t)
  }, [value])
  return (
    <span style={{ color, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}

// ── Probability arc ───────────────────────────────────────────────────────────
function ProbArc({ pct, label, color }) {
  const r = 54, cx = 64, cy = 64
  const circ = 2 * Math.PI * r
  const dash  = (Math.min(pct, 100) / 100) * circ
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <svg viewBox="0 0 128 128" width={110} height={110} style={{ display: "block", margin: "0 auto" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1c2128" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color}
          style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700 }}>
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#8b949e" style={{ fontSize: 10 }}>
          {label}
        </text>
      </svg>
    </div>
  )
}

// ── Crew card ─────────────────────────────────────────────────────────────────
function CrewCard({ member, payout, totalDevices, animDelay }) {
  const pct = (member.devices / totalDevices * 100).toFixed(1)
  return (
    <div style={{
      background: "#0d1117",
      border: `1px solid ${member.color}33`,
      borderRadius: 14,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      animation: `fadeUp 0.5s ease ${animDelay}s both`,
    }}>
      {member.you && (
        <span style={{
          position: "absolute", top: 10, right: 12,
          background: member.color + "22", color: member.color,
          border: `1px solid ${member.color}44`,
          borderRadius: 6, fontSize: 10, padding: "2px 8px", fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
        }}>YOU</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: member.color + "22",
          border: `2px solid ${member.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Mono', monospace", color: member.color, fontWeight: 700, fontSize: 13,
        }}>
          {member.name[0]}
        </div>
        <div>
          <div style={{ color: "#e6edf3", fontWeight: 700, fontSize: 15, fontFamily: "'Space Mono', monospace" }}>
            {member.name}
          </div>
          <div style={{ color: "#8b949e", fontSize: 11 }}>{member.devices} device{member.devices > 1 ? "s" : ""}</div>
        </div>
      </div>
      {/* Device bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e", marginBottom: 4 }}>
          <span>Cluster share</span>
          <span style={{ color: member.color }}>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "#21262d", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: `linear-gradient(90deg, ${member.color}, ${member.color}88)`,
            width: `${pct}%`, transition: "width 1s ease",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "#8b949e", fontSize: 11 }}>Block payout</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontWeight: 700,
          fontSize: 16, color: "#3fb950",
        }}>${Math.round(payout).toLocaleString()}</span>
      </div>
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "#161b22", border: "1px solid #21262d",
      borderRadius: 8, padding: "8px 14px", fontSize: 12,
    }}>
      <div style={{ color: "#8b949e", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: "'Space Mono', monospace" }}>
          {p.name}: {p.value?.toFixed(3)} GH/s
        </div>
      ))}
    </div>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus]   = useState(null)
  const [history, setHistory] = useState([])
  const [lastPoll, setLastPoll] = useState(null)
  const [newMembers, setNewMembers] = useState([])
  const [addCount, setAddCount] = useState(1)
  const [tab, setTab] = useState("dashboard")

  const { origEach } = calcPayouts(CREW, newMembers)
  const totalDevices  = CREW.reduce((s, m) => s + m.devices, 0)

  async function fetchStatus() {
    try {
      const res = await fetch(`${API}/status`)
      const d   = await res.json()
      setStatus(d); setLastPoll(new Date())
    } catch {}
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`${API}/history/all?hours=6`)
      const d   = await res.json()
      setHistory(d.map(r => ({
        time: new Date(r.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hashrate: parseFloat((r.total_hashrate || 0).toFixed(3)),
      })))
    } catch {}
  }

  useEffect(() => {
    fetchStatus(); fetchHistory()
    const si = setInterval(fetchStatus, 30000)
    const hi = setInterval(fetchHistory, 60000)
    return () => { clearInterval(si); clearInterval(hi) }
  }, [])

  const btc        = status?.stats?.btc_price_usd || 0
  const prob30     = parseFloat(status?.stats?.block_hit_prob_30d  || 0)
  const prob365    = parseFloat(status?.stats?.block_hit_prob_1yr  || 0)
  const totalTH    = (status?.cluster?.totalHashrateGhs || 0) / 1000
  const networkEH  = status?.stats?.network_hashrate_eh || 700
  const dailyBTC   = totalTH * 1000 / (networkEH * 1e9) * 144 * 3.125
  const dailyUSD   = dailyBTC * btc
  const online     = status?.cluster?.onlineCount || 0
  const total      = status?.cluster?.totalMiners  || 3

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060910; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        ::-webkit-scrollbar { width: 4px; background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 2px; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#060910", color: "#e6edf3",
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, #f7931a08 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 80% 80%, #58a6ff06 0%, transparent 50%)
        `,
      }}>
        {/* Scanline overlay */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff03 2px, #ffffff03 4px)",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", position: "relative", zIndex: 1 }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            marginBottom: 32, animation: "fadeUp 0.4s ease both",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "linear-gradient(135deg, #f7931a, #e67e00)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, boxShadow: "0 0 20px #f7931a44",
                }}>⚡</div>
                <div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700,
                    color: "#f7931a", letterSpacing: "-0.5px",
                  }}>BITAXE CLUSTER</div>
                  <div style={{ fontSize: 11, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase" }}>
                    Carbon · Neon · Argon
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: online === total ? "#3fb95018" : "#f8514918",
                border: `1px solid ${online === total ? "#3fb95044" : "#f8514944"}`,
                borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                color: online === total ? "#3fb950" : "#f85149",
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: online === total ? "#3fb950" : "#f85149",
                  animation: online > 0 ? "pulse 2s infinite" : "none",
                }} />
                {online}/{total} ONLINE
              </div>
              <div style={{ fontSize: 11, color: "#8b949e", marginTop: 6 }}>
                {lastPoll ? `synced ${lastPoll.toLocaleTimeString()}` : "connecting..."}
                {btc > 0 && <span style={{ color: "#f7931a", marginLeft: 8 }}>₿ ${btc.toLocaleString()}</span>}
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28, animation: "fadeUp 0.4s ease 0.05s both" }}>
            {[["dashboard", "Dashboard"], ["crew", "Crew"], ["payout", "Payout Calc"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                background: tab === id ? "#f7931a18" : "transparent",
                border: `1px solid ${tab === id ? "#f7931a44" : "#21262d"}`,
                borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 600,
                color: tab === id ? "#f7931a" : "#8b949e", cursor: "pointer",
                fontFamily: "'Space Mono', monospace", transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          {/* ── DASHBOARD TAB ─────────────────────────────────────────────── */}
          {tab === "dashboard" && <>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "CLUSTER HASHRATE", value: (status?.cluster?.totalHashrateGhs || 0).toFixed(2), suffix: " GH/s", color: "#f7931a", delay: 0.1 },
                { label: "DAILY EARNINGS",   value: dailyUSD.toFixed(4), prefix: "$", color: "#3fb950", delay: 0.15 },
                { label: "TOTAL EARNED",     value: (status?.cumulative?.total_usd || 0).toFixed(2), prefix: "$", color: "#58a6ff", delay: 0.2 },
                { label: "NETWORK",          value: (networkEH).toFixed(0), suffix: " EH/s", color: "#8b949e", delay: 0.25 },
              ].map(({ label, value, prefix, suffix, color, delay }) => (
                <div key={label} style={{
                  background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
                  padding: "18px 20px", animation: `fadeUp 0.5s ease ${delay}s both`,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(ellipse at top left, ${color}08 0%, transparent 60%)`,
                    pointerEvents: "none",
                  }} />
                  <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>
                    <Counter value={parseFloat(value) || 0} prefix={prefix || ""} suffix={suffix || ""} color={color}
                      decimals={value.toString().includes(".") ? value.toString().split(".")[1].length : 0} />
                  </div>
                </div>
              ))}
            </div>

            {/* Probability arcs */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "20px 24px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Block Hit Probability
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 }}>
                <ProbArc pct={prob30}  label="30 Days"  color="#f7931a" />
                <ProbArc pct={prob365} label="365 Days" color="#3fb950" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 160 }}>
                  <div style={{
                    background: "#3fb95015", border: "1px solid #3fb95033",
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>If block hit →</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: "#3fb950", fontWeight: 700 }}>
                      ~$100K each
                    </div>
                    <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>
                      3.125 BTC ÷ Carbon · Neon · Argon
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hashrate chart */}
            <div style={{
              background: "#0d1117", border: "1px solid #21262d", borderRadius: 14,
              padding: "20px 20px 12px", marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.35s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Cluster Hashrate — Last 6 Hours
              </div>
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f7931a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 10, fontFamily: "Space Mono" }} />
                    <YAxis stroke="#8b949e" tick={{ fontSize: 10, fontFamily: "Space Mono" }} unit=" GH/s" />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="hashrate" name="Hashrate"
                      stroke="#f7931a" strokeWidth={2} fill="url(#hg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  height: 180, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#8b949e", fontSize: 13, fontStyle: "italic",
                }}>Waiting for miners to connect...</div>
              )}
            </div>

            {/* Individual miners */}
            <div style={{ animation: "fadeUp 0.5s ease 0.4s both" }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Individual Miners
              </div>
              {status?.miners?.map((m, i) => (
                <div key={m.miner_ip} style={{
                  background: "#0d1117", border: `1px solid ${m.is_online ? "#21262d" : "#f8514922"}`,
                  borderRadius: 12, padding: "13px 18px", marginBottom: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: m.is_online ? "#3fb950" : "#f85149",
                      animation: m.is_online ? "pulse 2s infinite" : "none",
                    }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
                      {m.miner_name || m.miner_ip}
                    </span>
                    <span style={{ color: "#8b949e", fontSize: 11 }}>{m.miner_ip}</span>
                  </div>
                  <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
                    <span>⚡ <b style={{ color: "#f7931a", fontFamily: "Space Mono, monospace" }}>
                      {m.hashrate_ghs?.toFixed(2) || "—"} GH/s
                    </b></span>
                    <span>🌡 <b style={{ color: m.temp_c > 70 ? "#f85149" : "#e6edf3" }}>
                      {m.temp_c?.toFixed(0) || "—"}°C
                    </b></span>
                    <span style={{ color: "#8b949e" }}>{m.power_watts?.toFixed(1) || "—"}W</span>
                  </div>
                  <span style={{
                    background: m.is_online ? "#3fb95018" : "#f8514918",
                    color: m.is_online ? "#3fb950" : "#f85149",
                    border: `1px solid ${m.is_online ? "#3fb95044" : "#f8514944"}`,
                    borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                    fontFamily: "'Space Mono', monospace",
                  }}>{m.is_online ? "ONLINE" : "OFFLINE"}</span>
                </div>
              ))}
            </div>
          </>}

          {/* ── CREW TAB ──────────────────────────────────────────────────── */}
          {tab === "crew" && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
              {CREW.map((m, i) => (
                <CrewCard key={m.id} member={m} payout={origEach}
                  totalDevices={totalDevices + newMembers.reduce((s, n) => s + n.devices, 0)}
                  animDelay={i * 0.08} />
              ))}
            </div>
            <div style={{
              background: "#0d1117", border: "1px solid #21262d",
              borderRadius: 14, padding: "20px 24px",
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                Crew Agreement
              </div>
              {[
                "All block payouts split equally 3 ways between Carbon, Neon, and Argon",
                "New members pay 20% tax on their proportional share back to original crew",
                "Devices can be hosted at any location — ownership tracked by wallet address",
                "Anyone who joins signs a written agreement before hardware is purchased",
              ].map((rule, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: "10px 0", borderBottom: i < 3 ? "1px solid #21262d" : "none",
                }}>
                  <span style={{ color: "#f7931a", fontFamily: "Space Mono, monospace", fontSize: 12, minWidth: 20 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 13, color: "#e6edf3", lineHeight: 1.5 }}>{rule}</span>
                </div>
              ))}
            </div>
          </>}

          {/* ── PAYOUT CALC TAB ───────────────────────────────────────────── */}
          {tab === "payout" && <>
            <div style={{
              background: "#0d1117", border: "1px solid #21262d",
              borderRadius: 14, padding: "20px 24px", marginBottom: 20,
              animation: "fadeUp 0.5s ease 0.1s both",
            }}>
              <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Add New Members (Taxed 20%)
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <input type="number" min={1} max={10} value={addCount}
                  onChange={e => setAddCount(parseInt(e.target.value) || 1)}
                  style={{
                    width: 70, background: "#161b22", border: "1px solid #21262d",
                    borderRadius: 8, padding: "8px 12px", color: "#e6edf3",
                    fontFamily: "'Space Mono', monospace", fontSize: 13,
                  }} />
                <span style={{ color: "#8b949e", fontSize: 13 }}>devices for new member</span>
                <button onClick={() => setNewMembers(p => [...p, { id: Date.now(), devices: addCount }])}
                  style={{
                    background: "#f7931a22", border: "1px solid #f7931a44",
                    borderRadius: 8, padding: "8px 18px", color: "#f7931a",
                    fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                    cursor: "pointer",
                  }}>+ ADD</button>
                {newMembers.length > 0 && (
                  <button onClick={() => setNewMembers([])} style={{
                    background: "#f8514918", border: "1px solid #f8514944",
                    borderRadius: 8, padding: "8px 14px", color: "#f85149",
                    fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
                  }}>CLEAR</button>
                )}
              </div>
              {newMembers.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {newMembers.map((m, i) => (
                    <span key={m.id} style={{
                      background: "#bc8cff18", border: "1px solid #bc8cff44",
                      borderRadius: 6, padding: "4px 10px", fontSize: 12,
                      color: "#bc8cff", fontFamily: "Space Mono, monospace",
                    }}>Member {i + 1}: {m.devices} device{m.devices > 1 ? "s" : ""}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Payout breakdown */}
            {(() => {
              const { origEach, newShare } = calcPayouts(CREW, newMembers)
              const allDevices = totalDevices + newMembers.reduce((s, m) => s + m.devices, 0)
              const newEach = newMembers.length > 0
                ? newShare / newMembers.length : 0
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, animation: "fadeUp 0.5s ease 0.2s both" }}>
                  <div style={{
                    background: "#0d1117", border: "1px solid #3fb95033",
                    borderRadius: 14, padding: "22px 24px",
                    background: "linear-gradient(135deg, #0d1117, #3fb95008)",
                  }}>
                    <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                      Carbon · Neon · Argon
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, color: "#3fb950" }}>
                      ${Math.round(origEach).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>each — always equal split</div>
                    <div style={{ fontSize: 11, color: "#3fb95088", marginTop: 10 }}>
                      {totalDevices} devices · {(totalDevices / allDevices * 100).toFixed(1)}% of cluster
                      {newMembers.length > 0 && ` + 20% tax from ${newMembers.length} new member${newMembers.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div style={{
                    background: "#0d1117", border: "1px solid #bc8cff33",
                    borderRadius: 14, padding: "22px 24px",
                    background: "linear-gradient(135deg, #0d1117, #bc8cff08)",
                    opacity: newMembers.length > 0 ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: 10, color: "#8b949e", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                      New Members (each)
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, color: "#bc8cff" }}>
                      {newMembers.length > 0 ? `$${Math.round(newEach).toLocaleString()}` : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#8b949e", marginTop: 6 }}>after 20% tax to orig crew</div>
                    <div style={{ fontSize: 11, color: "#bc8cff88", marginTop: 10 }}>
                      {newMembers.length > 0
                        ? `${newMembers.reduce((s, m) => s + m.devices, 0)} devices · ${(newMembers.reduce((s, m) => s + m.devices, 0) / allDevices * 100).toFixed(1)}% of cluster`
                        : "Add new members above"}
                    </div>
                  </div>
                </div>
              )
            })()}
          </>}

        </div>
      </div>
    </>
  )
}
