const freshTeam = [
  { id: "f1", name: "LALIT PODDAR", email: "lalit.poddar@s4s.in", totalCount: 42, targetAmount: 1400000, achievedCount: 48, achievedAmount: 1824000 },
  { id: "f2", name: "AMIT KUMAR SINGH", email: "amit.singh@s4s.in", totalCount: 40, targetAmount: 1300000, achievedCount: 46, achievedAmount: 1710000 },
  { id: "f3", name: "PRIYA RANI", email: "priya.rani@s4s.in", totalCount: 38, targetAmount: 1250000, achievedCount: 44, achievedAmount: 1645000 },
  { id: "f4", name: "RAHUL SHARMA", email: "rahul.sharma@s4s.in", totalCount: 36, targetAmount: 1200000, achievedCount: 42, achievedAmount: 1580000 },
  { id: "f5", name: "NEHA GUPTA", email: "neha.gupta@s4s.in", totalCount: 35, targetAmount: 1180000, achievedCount: 41, achievedAmount: 1520000 },
  { id: "f6", name: "VIKAS YADAV", email: "vikas.yadav@s4s.in", totalCount: 34, targetAmount: 1150000, achievedCount: 40, achievedAmount: 1480000 },
  { id: "f7", name: "SONALI PATEL", email: "sonali.patel@s4s.in", totalCount: 33, targetAmount: 1120000, achievedCount: 39, achievedAmount: 1440000 },
  { id: "f8", name: "MANISH TIWARI", email: "manish.tiwari@s4s.in", totalCount: 32, targetAmount: 1100000, achievedCount: 38, achievedAmount: 1390000 },
  { id: "f9", name: "KAVITA JOSHI", email: "kavita.joshi@s4s.in", totalCount: 31, targetAmount: 1050000, achievedCount: 37, achievedAmount: 1310000 },
  { id: "f10", name: "DEEPAK MISHRA", email: "deepak.mishra@s4s.in", totalCount: 29, targetAmount: 850000, achievedCount: 35, achievedAmount: 1301000 }
];

const repeatTeam = [
  { id: "r1", name: "ROHIT VERMA", email: "rohit.verma@s4s.in", totalCount: 32, targetAmount: 1400000, achievedCount: 38, achievedAmount: 1580000 },
  { id: "r2", name: "ANJALI MEHTA", email: "anjali.mehta@s4s.in", totalCount: 31, targetAmount: 1250000, achievedCount: 37, achievedAmount: 1420000 },
  { id: "r3", name: "SANJAY KUMAR", email: "sanjay.kumar@s4s.in", totalCount: 31, targetAmount: 1200000, achievedCount: 37, achievedAmount: 1380000 },
  { id: "r4", name: "POOJA NAYAK", email: "pooja.nayak@s4s.in", totalCount: 30, targetAmount: 1100000, achievedCount: 36, achievedAmount: 1280000 },
  { id: "r5", name: "ARJUN REDDY", email: "arjun.reddy@s4s.in", totalCount: 30, targetAmount: 1050000, achievedCount: 36, achievedAmount: 1220000 },
  { id: "r6", name: "MEENA KUMARI", email: "meena.kumari@s4s.in", totalCount: 30, targetAmount: 1000000, achievedCount: 36, achievedAmount: 1180000 },
  { id: "r7", name: "TARUN SAXENA", email: "tarun.saxena@s4s.in", totalCount: 29, targetAmount: 1000000, achievedCount: 35, achievedAmount: 1150000 },
  { id: "r8", name: "RITU AGARWAL", email: "ritu.agarwal@s4s.in", totalCount: 29, targetAmount: 1000000, achievedCount: 35, achievedAmount: 1483700 }
];

const headerUsers = [
  { name: "LALIT PODDAR", email: "lalit.poddar@s4s.in", online: true },
  { name: "PRIYA RANI", email: "priya.rani@s4s.in", online: true },
  { name: "ROHIT VERMA", email: "rohit.verma@s4s.in", online: true }
];

const currentUser = {
  name: "BAMBAM KUMAR RAY",
  role: "Team Leader",
  email: "bambam.ray@s4s.in"
};

function enrich(rows, team) {
  const totalTarget = rows.reduce((s, r) => s + r.targetAmount, 0);
  return rows
    .map((r) => ({
      ...r,
      team,
      pctOfTotal: totalTarget ? (r.targetAmount / totalTarget) * 100 : 0,
      pctAchievement: r.targetAmount ? (r.achievedAmount / r.targetAmount) * 100 : 0
    }))
    .sort((a, b) => b.achievedAmount - a.achievedAmount)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function totals(rows) {
  const targetCount = rows.reduce((s, r) => s + r.totalCount, 0);
  const targetAmount = rows.reduce((s, r) => s + r.targetAmount, 0);
  const achievedCount = rows.reduce((s, r) => s + r.achievedCount, 0);
  const achievedAmount = rows.reduce((s, r) => s + r.achievedAmount, 0);
  return {
    targetCount,
    targetAmount,
    achievedCount,
    achievedAmount,
    achievementPct: targetAmount ? (achievedAmount / targetAmount) * 100 : 0
  };
}

const now = new Date();
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

export function getDashboard() {
  const fresh = enrich(freshTeam, "fresh");
  const repeat = enrich(repeatTeam, "repeat");
  const freshTotals = totals(fresh);
  const repeatTotals = totals(repeat);
  const combined = {
    targetCount: freshTotals.targetCount + repeatTotals.targetCount,
    targetAmount: freshTotals.targetAmount + repeatTotals.targetAmount,
    achievedCount: freshTotals.achievedCount + repeatTotals.achievedCount,
    achievedAmount: freshTotals.achievedAmount + repeatTotals.achievedAmount
  };
  combined.achievementPct = (combined.achievedAmount / combined.targetAmount) * 100;

  return {
    currentUser,
    headerUsers,
    kpis: combined,
    freshTotals,
    repeatTotals,
    freshTeam: fresh,
    repeatTeam: repeat,
    topFresh: fresh.slice(0, 3),
    topRepeat: repeat.slice(0, 3),
    mission: {
      title: `Mission ₹27 Cr — ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      targetCr: 27,
      achievedCr: 4.16,
      milestones: [6.75, 13.5, 20.25, 27],
      day: now.getDate(),
      daysInMonth
    },
    sidebarMission: {
      label: `MISSION PROGRESS ${monthNames[now.getMonth()].toUpperCase()} ${now.getFullYear()}`,
      pct: 52,
      achievedLabel: "₹14.16 Cr",
      targetLabel: "₹27 Cr"
    },
    alerts: [
      { id: 1, type: "success", text: "Fresh team crossed 120% achievement today.", time: "2 min ago" },
      { id: 2, type: "warning", text: "Repeat DRR gap vs target on 2 members.", time: "18 min ago" },
      { id: 3, type: "info", text: "September mission clock: Day " + now.getDate() + " of " + daysInMonth + ".", time: "1 hr ago" }
    ]
  };
}

export function getLeaderboard() {
  const all = [
    ...enrich(freshTeam, "fresh"),
    ...enrich(repeatTeam, "repeat")
  ].sort((a, b) => b.achievedAmount - a.achievedAmount)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return all;
}
