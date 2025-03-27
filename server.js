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
    console.log('データ保存開始:', DATA_FILE);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('データ保存成功');
    return true;
  } catch (err) {
    console.error('データの保存エラー:', err.message);
    console.error('エラースタック:', err.stack);
    return false;
  }
}

// ルート
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/api/data', (req, res) => {
  try {
    const newData = req.body;
    console.log('受信データ:', JSON.stringify(newData).substring(0, 200) + '...');
    
    if (!newData || !newData.meetings) {
      return res.status(400).json({ 
        success: false, 
        message: '不正なデータ形式です。meetings プロパティが必要です。' 
      });
    }
    
    if (saveData(newData)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'データの保存に失敗しました。サーバーログを確認してください。' 
      });
    }
  } catch (err) {
    console.error('APIエラー:', err.message);
    console.error('エラースタック:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'サーバーエラーが発生しました: ' + err.message 
    });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});