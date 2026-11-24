QAテスト版：qa/ に spec-share-test.html と shared-spec-master.json を新規追加。
GitHub Pagesから spec-share-test.html を開く。
社員設定で「岡田」を選ぶと仕様書一覧PDF取込欄が表示される。
PDF取込後、画面の「チェックした内容を登録」を実行し、「共有用JSONを書き出す」で shared-spec-master.json を取得。
そのファイルをGitHubの qa/shared-spec-master.json に上書きして変更確定。
他の社員は再読み込みすると共有仕様書を取得できる。
注意：岡田選択は認証ではない。GitHubへのアップロードにはGitHubアカウントの権限が必要。
注意：QA版は本番の個人端末データを参照しません。本番移行時は既存端末の仕様書を明示的に共有マスターへ統合します。
