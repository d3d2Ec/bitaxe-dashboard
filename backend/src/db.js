const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/mining.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    miner_ip TEXT, miner_name TEXT, timestamp INTEGER,
    hashrate_ghs REAL, temp_c REAL, power_watts REAL,
    uptime_secs INTEGER, best_diff TEXT, pool_url TEXT, is_online INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS totals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    updated_at INTEGER, total_btc_earned REAL DEFAULT 0,
    total_usd_earned REAL DEFAULT 0, block_hit_prob_30d REAL DEFAULT 0,
    block_hit_prob_1yr REAL DEFAULT 0, network_hashrate_eh REAL, btc_price_usd REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_str TEXT, miner_ip TEXT, avg_hashrate REAL,
    estimated_btc REAL, estimated_usd REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at INTEGER, type TEXT, message TEXT
  )`);
});

function getDb() { return db; }
module.exports = { getDb };