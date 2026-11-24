# 開発仕様（2026-11-24）

## 現行機能
日報入力・編集・削除、物件別管理、重複時間警告、カレンダー、社員別月報、物件アーカイブ・復元、内部バックアップ最大5件、外部JSONバックアップ、旧Word取込、赤黒文字編集、仕様書マスター。

## 保存互換性
localStorage: nippo.v2.data（本体）、nippo.v15.myEmployee（社員）、nippo.v13.wordPageHeaders（Wordページ情報）、nippo.v16.localHistory.1（内部履歴）、nippo.v16.officialMaster / nippo.v16.removedOfficialMaster（仕様書）。キー変更や保存形式変更は移行・復元試験必須。

## 帳票の既存運用要件
毎月20日締め（21日〜翌20日）。Wordは物件別10件/ページ、物件別連番、追記ページのみ提出月更新。Excelは社員別集計、労働・残業・深夜時間、既存テンプレート維持。細部は実コード・テンプレートと照合すること。

## 現行共有仕様書
shared-spec.js は shared-spec-master.json をキャッシュ回避して取得。schema: nippo-shared-official-master-v1、items配列、updatedAt。最大10000件・1500000文字の検査あり。ローカルと追加マージし日報・メモを変更しない。岡田選択時のみJSON出力UI表示。ただし認証ではない。GitHubへの手動アップロードが必要。

## 次期要件（未実装）
Cloudflareでマスター共有。管理者がアプリ内でPDFから登録、社員はGitHubアカウントなしで閲覧・同期。既存登録分を維持。サーバー側で更新者認証・入力検証、読取と書込権限を分離。PDF原本共有の要否は別途確認。
