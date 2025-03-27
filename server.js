const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ミドルウェア
app.use(express.static(__dirname));
app.use(bodyParser.json());

// データの読み込み
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('データの読み込みエラー:', err);
    return { meetings: [], masterPassword: "admin123" };
  }
}

// データの保存
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('データの保存エラー:', err);
    return false;
  }
}

// ルート
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/api/data', (req, res) => {
  const newData = req.body;
  if (saveData(newData)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: 'データの保存に失敗しました' });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});