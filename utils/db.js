const fs   = require('fs');
const path = require('path');

const DATA_FILE    = path.join(__dirname, '../data/points.json');
const COUNTER_FILE = path.join(__dirname, '../data/counter.json');
const RATINGS_FILE = path.join(__dirname, '../data/ratings.json');

function ensureFile(file, def) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(def));
  }
}

function getNextTicketNumber() {
  ensureFile(COUNTER_FILE, { count: 0 });
  const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
  data.count++;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
  return data.count;
}

function load() {
  ensureFile(DATA_FILE, {});
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return {}; }
}
function save(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function defaultUser() {
  return {
    points: 0, xp: 0, xpMax: 450, msgsToday: 0, lastMsgDate: '',
    stats: { tickets: 0, bans: 0, warns: 0, kicks: 0, mutes: 0, autres: 0 }
  };
}

function getUser(userId) {
  const data = load();
  if (!data[userId]) data[userId] = defaultUser();
  return data[userId];
}

function addPoints(userId, amount, statKey = null) {
  const data = load();
  if (!data[userId]) data[userId] = defaultUser();
  data[userId].points += amount;
  data[userId].xp     += amount * 10;
  while (data[userId].xp >= data[userId].xpMax) {
    data[userId].xp   -= data[userId].xpMax;
    data[userId].xpMax = Math.floor(data[userId].xpMax * 1.2);
  }
  if (statKey && data[userId].stats[statKey] !== undefined) data[userId].stats[statKey]++;
  save(data);
}

function getRank(userId) {
  const data   = load();
  const sorted = Object.entries(data).sort(([,a],[,b]) => b.points - a.points).map(([id]) => id);
  const idx    = sorted.indexOf(userId);
  return idx === -1 ? 999 : idx + 1;
}

function getLeaderboard(n = 10) {
  const data = load();
  return Object.entries(data)
    .sort(([,a],[,b]) => b.points - a.points)
    .slice(0, n)
    .map(([id, d]) => ({ userId: id, ...d }));
}

// حفظ التقييم
function saveRating(userId, ticketNum, stars) {
  ensureFile(RATINGS_FILE, []);
  const ratings = JSON.parse(fs.readFileSync(RATINGS_FILE, 'utf-8'));
  ratings.push({ userId, ticketNum, stars, date: new Date().toISOString() });
  fs.writeFileSync(RATINGS_FILE, JSON.stringify(ratings, null, 2));
}

// متوسط التقييمات
function getAverageRating() {
  ensureFile(RATINGS_FILE, []);
  const ratings = JSON.parse(fs.readFileSync(RATINGS_FILE, 'utf-8'));
  if (!ratings.length) return { avg: 0, total: 0 };
  const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
  return { avg: Math.round(avg * 10) / 10, total: ratings.length };
}

module.exports = { getUser, addPoints, getRank, getLeaderboard, getNextTicketNumber, saveRating, getAverageRating };
