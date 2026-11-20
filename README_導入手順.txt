日報アプリ 本番版 Ver.17.3.10 赤字入力機能

対象: GitHub uedayasuhiro0315-cell/nippo-app のルート（qa/ ではない）

1) 本番アプリの設定画面からJSONバックアップを保存（最優先）。
2) このZIPの index.html、export-v16.js をルートに上書き、rich-work.js を新規追加。
3) word-template.docx / monthly-template.xlsx / import-v9.js / manifest / qa は変更しない。
4) 本番アプリをSafariで開き、Ver.17.3.10 と赤字ボタンを確認。
5) 新しい作業記録で赤字の保存・再編集とWord出力を試験する。
6) 初回試験は実際の業務データを壊さないよう、既存記録を編集せずテスト用記録で実施し、終わったらテスト記録を削除する。

注意: GitHubへの自動アップロードは行っていません。
QA版Ver.17.3.9の赤字入力とWord色出力部分だけを、本番Ver.17.3.6に移植しました。
本番既存の社員・月報・Word雛形・インポート処理を保つ設計です。
