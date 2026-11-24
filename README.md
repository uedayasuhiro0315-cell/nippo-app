# 作業日報・物件管理

現行確認版: Ver.17.3.21（2026-11-24）。GitHub Pages向け静的Webアプリ。iPhone・PC対応。

## 確認済み主要ファイル
- index.html: UI、日報、物件、社員設定、保存・復元、カレンダー、仕様書マスター。
- export-v16.js: Word日報・Excel月報出力。word-template.docx / monthly-template.xlsx を参照。
- import-v9.js: 旧Word日報取込。
- rich-work.js: 赤黒文字編集。
- shared-spec.js: 共有マスター取得・JSON出力。
- manifest.webmanifest: ホーム画面用設定。
- JSZip 3.10.1: CDN依存。

詳細は SPEC.md、HANDOVER.md、CHANGELOG.md。公開リポジトリに秘密鍵・認証情報・個人の日報バックアップを置かないこと。
