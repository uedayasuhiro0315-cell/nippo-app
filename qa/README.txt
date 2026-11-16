日報アプリ OneDrive提出機能・QA試作 1.0

設置方法
1. このZIPを展開
2. onedrive-test.html を GitHub の nippo-app/qa/ フォルダに新規アップロード（既存ファイル上書き不要）
3. https://uedayasuhiro0315-cell.github.io/nippo-app/qa/onedrive-test.html を開く
4. QA社員設定を「植田」にしておく
5. 普段どおりWord/Excelを出力し、ファイルを選択して共有メニューからOneDriveへ提出
6. OneDrive側で保存されたファイルを確認

重要
- 自動アップロードや送信成功判定は未実装。Microsoft Graph認証とは別。
- QA用の社員設定を読み取るためGitHub Pages配下で開く必要がある。
- 本番版のソースやデータは変更しない。
- OneDrive共有URLはコードに埋め込まれていない。
- 許可する操作は通常のGitHub手動アップロードのみ。
