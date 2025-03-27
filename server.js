const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// サーバー環境に応じてデータファイルのパスを調整
// 一部のホスティングではtmp/フォルダなど特定の場所にのみ書き込み可能な場合がある
const ENVIRONMENT = process.env.NODE_ENV || 'development';
let DATA_FILE;

if (ENVIRONMENT === 'production' && process.env.DATA_FILE_PATH) {
  // 環境変数からデータファイルのパスを取得（ホスティング環境で設定）
  DATA_FILE = process.env.DATA_FILE_PATH;
  console.log('本番環境用データファイルパス:', DATA_FILE);
} else {
  // 開発環境ではプロジェクトディレクトリ内のdata.jsonを使用
  DATA_FILE = path.join(__dirname, 'data.json');
  console.log('開発環境用データファイルパス:', DATA_FILE);
}

// リクエスト処理のタイムアウト設定
// サーバーの負荷が高い場合やネットワーク遅延がある場合に効果的
const TIMEOUT_MS = 30000; // 30秒
app.use((req, res, next) => {
  res.setTimeout(TIMEOUT_MS, () => {
    console.error('リクエストがタイムアウトしました:', req.path);
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'サーバーの処理がタイムアウトしました。後でもう一度お試しください。'
      });
    }
  });
  next();
});

// エラーハンドリングミドルウェア
// エラーキャッチミドルウェア（制限エラーなどをキャッチ）
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err.name, err.message);
  
  // JSON解析エラーの場合
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSONパースエラー:', err.message);
    return res.status(400).json({
      success: false,
      message: 'リクエストデータの形式が不正です。有効なJSONを送信してください。'
    });
  }
  
  // リクエストサイズの制限を超えた場合
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'リクエストデータが大きすぎます。データ量を減らしてください。'
    });
  }
  
  // その他のエラー
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました。しばらく経ってからもう一度お試しください。'
    });
  }
});

// ミドルウェア
app.use(express.static(__dirname));
// ボディパーサーの制限を増やす（データサイズが大きい場合に必要）
app.use(bodyParser.json({ limit: '10mb' }));

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
        '土谷順彦', '内藤　整', '西田隼人', '八木真由', '山岸敦史',
        '成澤貴史', '福原宏樹', '髙井優季', '末永信太', '伊藤　英',
        '深井惇史', '堀　聡美', '佐々木有貴'
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
        '土谷順彦', '内藤　整', '西田隼人', '八木真由', '山岸敦史',
        '成澤貴史', '福原宏樹', '髙井優季', '末永信太', '伊藤　英',
        '深井惇史', '堀　聡美', '佐々木有貴'
      ],
      masterPassword: "admin123" 
    };
  }
}

// データの保存
function saveData(data) {
  try {
    console.log('データ保存開始:', DATA_FILE);
    
    // データの整合性チェック
    if (!data) {
      console.error('保存データが null または undefined です');
      return false;
    }
    
    // 必須プロパティの存在チェック
    if (!data.meetings) {
      console.error('保存データに meetings プロパティがありません');
      data.meetings = [];
    }
    
    if (!data.staffList) {
      console.error('保存データに staffList プロパティがありません');
      data.staffList = [
        '土谷順彦', '内藤　整', '西田隼人', '八木真由', '山岸敦史',
        '成澤貴史', '福原宏樹', '髙井優季', '末永信太', '伊藤　英',
        '深井惇史', '堀　聡美', '佐々木有貴'
      ];
    }
    
    if (!data.masterPassword) {
      console.error('保存データに masterPassword プロパティがありません');
      data.masterPassword = 'admin123';
    }
    
    // データが配列であることを確認
    if (!Array.isArray(data.meetings)) {
      console.error('meetings が配列ではありません:', typeof data.meetings);
      data.meetings = [];
    }
    
    if (!Array.isArray(data.staffList)) {
      console.error('staffList が配列ではありません:', typeof data.staffList);
      data.staffList = [
        '土谷順彦', '内藤　整', '西田隼人', '八木真由', '山岸敦史',
        '成澤貴史', '福原宏樹', '髙井優季', '末永信太', '伊藤　英',
        '深井惇史', '堀　聡美', '佐々木有貴'
      ];
    }
    
    // データサイズを確認
    const jsonData = JSON.stringify(data, null, 2);
    const sizeInKB = (jsonData.length / 1024).toFixed(2);
    console.log('保存データサイズ:', sizeInKB + 'KB');
    console.log('保存データ構造:', jsonData.substring(0, 200) + '...');
    
    // ディレクトリが存在することを確認
    const directory = path.dirname(DATA_FILE);
    
    // サーバー環境に応じた保存処理
    try {
      let saveSuccessful = false;
      
      // 方法1: 直接書き込み
      try {
        fs.writeFileSync(DATA_FILE, jsonData, { encoding: 'utf8' });
        console.log('直接書き込みで成功');
        saveSuccessful = true;
      } catch (directWriteErr) {
        console.error('直接書き込みエラー:', directWriteErr.message);
      }
      
      // 方法1が失敗した場合、方法2を試す: 一時ファイル経由
      if (!saveSuccessful) {
        const tempFile = `${directory}/temp_${Date.now()}.json`;
        try {
          // 一時ファイルに書き込む
          fs.writeFileSync(tempFile, jsonData, { encoding: 'utf8' });
          console.log('一時ファイルへの書き込み成功:', tempFile);
          
          // 一時ファイルを本来のファイルに移動
          fs.renameSync(tempFile, DATA_FILE);
          console.log('リネームに成功しました');
          saveSuccessful = true;
        } catch (tempErr) {
          console.error('一時ファイル経由の書き込みエラー:', tempErr.message);
          // 一時ファイルが残っていたら削除を試みる
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          } catch (cleanupErr) {
            console.error('一時ファイル削除エラー:', cleanupErr.message);
          }
        }
      }
      
      // 方法3: fsモジュールのwriteFile（非同期APIを同期的に使用）
      if (!saveSuccessful) {
        try {
          // まずsyncを試す
          try {
            fs.writeFileSync(DATA_FILE, jsonData, 'utf8');
            console.log('fs.writeFileSync による書き込み成功');
            saveSuccessful = true;
          } catch (syncWriteErr) {
            console.error('fs.writeFileSync エラー:', syncWriteErr.message);
            
            // 非同期処理も試す
            const writeFilePromise = new Promise((resolve, reject) => {
              fs.writeFile(DATA_FILE, jsonData, 'utf8', (err) => {
                if (err) reject(err);
                else {
                  console.log('fs.writeFile による書き込み成功');
                  saveSuccessful = true;
                  resolve();
                }
              });
            });
            
            // 同期的に結果を待つことはせず、非同期処理として実行
            writeFilePromise.catch(err => {
              console.error('非同期書き込みエラー:', err.message);
            });
          }
        } catch (writeFileErr) {
          console.error('fs.writeFile による書き込みエラー:', writeFileErr.message);
        }
      }
      
      if (saveSuccessful) {
        console.log('データ保存成功');
        return true;
      } else {
        console.error('すべての保存方法が失敗しました');
        return false;
      }
    } catch (err) {
      console.error('データ保存処理中のエラー:', err.message);
      console.error('エラースタック:', err.stack);
      return false;
    }
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
  // リクエスト処理開始時間を記録（パフォーマンス計測用）
  const startTime = Date.now();
  
  // リクエストのIPアドレスとUAを記録（トラブルシューティング用）
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  console.log(`APIリクエスト: /api/data (IP: ${clientIP}, UA: ${userAgent})`);
  
  try {
    const newData = req.body;
    
    // リクエストボディのサイズをチェック
    const requestBodySize = JSON.stringify(newData).length;
    console.log(`受信データサイズ: ${(requestBodySize / 1024).toFixed(2)}KB`);
    
    if (requestBodySize > 5 * 1024 * 1024) { // 5MB以上の場合
      console.error('リクエストデータが大きすぎます:', requestBodySize);
      return res.status(413).json({
        success: false,
        message: 'リクエストデータが大きすぎます。データサイズを縮小してください。'
      });
    }
    
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
    
    // データの整合性チェック - 循環参照などをチェック
    try {
      // 深いコピーを作成することで循環参照などの問題をチェック
      const dataCopy = JSON.parse(JSON.stringify(newData));
    } catch (jsonErr) {
      console.error('データの循環参照エラー:', jsonErr.message);
      return res.status(400).json({
        success: false,
        message: 'データに循環参照などの問題があります。データ構造を確認してください。'
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
    
    // データ保存処理を非同期で実行（レスポンスの高速化のため）
    const saveResult = saveData(newData);
    
    if (saveResult) {
      const processingTime = Date.now() - startTime;
      console.log(`データ保存に成功しました (処理時間: ${processingTime}ms)`);
      
      // キャッシュ制御ヘッダーを設定
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.json({ 
        success: true,
        processingTime: processingTime 
      });
    } else {
      console.error('saveData関数がfalseを返しました');
      return res.status(500).json({ 
        success: false, 
        message: 'データの保存に失敗しました。しばらく経ってから再度お試しください。' 
      });
    }
  } catch (err) {
    // エラーの詳細をログに出力（トラブルシューティング用）
    console.error('APIエラー:', err.name, err.message);
    console.error('エラースタック:', err.stack);
    
    // クライアント向けエラーメッセージ（セキュリティのため詳細は最小限に）
    let errorMessage = 'サーバーエラーが発生しました。';
    
    // エラータイプに応じたカスタムメッセージ
    if (err instanceof SyntaxError) {
      errorMessage += 'データ形式が正しくありません。';
    } else if (err.code === 'EACCES' || err.code === 'EPERM') {
      errorMessage += 'サーバーの権限エラーが発生しました。管理者にお問い合わせください。';
    } else if (err.code === 'ENOSPC') {
      errorMessage += 'サーバーのディスク容量が不足しています。管理者にお問い合わせください。';
    } else {
      errorMessage += 'しばらく経ってから再度お試しください。';
    }
    
    return res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});