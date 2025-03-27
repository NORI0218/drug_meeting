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
    const parsedData = JSON.parse(data);
    
    // 必須プロパティの存在を確認し、なければデフォルト値を設定
    if (!parsedData.meetings) {
      console.warn('データファイルにmeetingsプロパティがありません。初期化します。');
      parsedData.meetings = [];
    }
    
    if (!parsedData.staffList) {
      console.warn('データファイルにstaffListプロパティがありません。デフォルト値を設定します。');
      parsedData.staffList = [
        '土谷順彦', '内藤整', '西田隼人', '八木真由', '山岸敦史',
        '成澤貴史', '福原宏樹', '髙井優季', '末永信太', '伊藤英',
        '深井惇史', '堀聡美', '佐々木有貴'
      ];
    }
    
    if (!parsedData.masterPassword) {
      console.warn('データファイルにmasterPasswordプロパティがありません。デフォルト値を設定します。');
      parsedData.masterPassword = "admin123";
    }
    
    return parsedData;
  } catch (err) {
    console.error('データの読み込みエラー:', err);
    // デフォルト値を返す
    return { 
      meetings: [], 
      staffList: [
        '土谷順彦', '内藤整', '西田隼人', '八木真由', '山岸敦史',
        '成澤貴史', '福原宏樹', '髙井優季', '末永信太', '伊藤英',
        '深井惇史', '堀聡美', '佐々木有貴'
      ],
      masterPassword: "admin123" 
    };
  }
}

// データの保存
function saveData(data) {
  try {
    console.log('データ保存開始:', DATA_FILE);
    console.log('保存データ構造:', JSON.stringify(data).substring(0, 200) + '...');
    
    // ディレクトリが存在することを確認
    const directory = path.dirname(DATA_FILE);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log('ディレクトリを作成しました:', directory);
    }
    
    // ファイルが書き込み可能か確認
    try {
      fs.accessSync(directory, fs.constants.W_OK);
      console.log('ディレクトリは書き込み可能です');
    } catch (accessErr) {
      console.error('ディレクトリの書き込み権限エラー:', accessErr.message);
    }
    
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
    
    if (!newData) {
      console.error('リクエストデータが空です');
      return res.status(400).json({ 
        success: false, 
        message: 'リクエストデータが空です' 
      });
    }
    
    if (!newData.meetings) {
      console.error('meetings プロパティがありません:', Object.keys(newData));
      return res.status(400).json({ 
        success: false, 
        message: '不正なデータ形式です。meetings プロパティが必要です。' 
      });
    }
    
    // meetingsが配列であることを確認
    if (!Array.isArray(newData.meetings)) {
      console.error('meetingsが配列ではありません:', typeof newData.meetings);
      return res.status(400).json({
        success: false,
        message: 'meetings は配列である必要があります'
      });
    }
    
    // staffListが存在するか確認し、存在しない場合は現在のデータから取得
    if (!newData.staffList) {
      console.warn('リクエストデータにstaffListがありません');
      const currentData = readData();
      newData.staffList = currentData.staffList;
      console.log('現在のデータからstaffListを継承:', JSON.stringify(newData.staffList).substring(0, 100) + '...');
    } else if (!Array.isArray(newData.staffList)) {
      console.error('staffListが配列ではありません:', typeof newData.staffList);
      return res.status(400).json({
        success: false,
        message: 'staffList は配列である必要があります'
      });
    }
    
    // masterPasswordが存在することを確認
    if (newData.masterPassword === undefined) {
      console.error('masterPasswordが存在しません');
      // デフォルト値を設定
      newData.masterPassword = 'admin123';
    }
    
    console.log('データ検証完了、保存を試みます');
    if (saveData(newData)) {
      console.log('データ保存に成功しました');
      res.json({ success: true });
    } else {
      console.error('saveData関数がfalseを返しました');
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