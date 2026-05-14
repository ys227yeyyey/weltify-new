# Weltify — アウトリーチ自動化ワークフロー

## 概要

団体アウトリーチ（組織へのウェイトリスト共有依頼）を半自動化するマルチエージェント構成。
オーケストレーター（このセッション）が指揮し、2種類のサブエージェントが分担する。

## 実行手順

### 0. Gmail MCP 接続確認
```
mcp__claude_ai_Gmail__search_threads で in:sent を実行
→ 送信元が weltifyteam@gmail.com であることを確認
→ エラーの場合はユーザーに再認証を依頼
```

### 1. run_id 生成
```bash
date -u +%Y%m%d_%H%M%S
```
生成した run_id を変数として保持し、以降の全ステップで使う。

### 2. 検索条件をユーザーから受け取る
例: 「ヨーロッパのバックパッカーコミュニティを5組」「東京の語学学校を5組」

### 3. org_finder エージェントを起動
起動プロンプトに必ず含めるもの:
- run_id
- comm.md パス (`weltify-new/comm.md`)
- plan-summary.html パス (`weltify-new/plan-summary.html`)
- 検索条件

完了後 `comm.md` を Read し `ESCALATE[orgs]:` がないか確認。
あれば `AskUserQuestion` でユーザーに提示し、回答を反映して再起動。

### 4. email_writer を5体並列起動（1メッセージに5つの Agent 呼び出し）
各体に渡すもの:
- index N（1〜5）
- orgs.md パス (`.claude/outbox/{run_id}/orgs.md`)
- 出力先パス (`.claude/outbox/{run_id}/email_{N}.txt`)

### 5. 生成メールをユーザーに提示
`email_1.txt`〜`email_5.txt` を全て Read し、宛先・本文（件名は5通共通の固定文）をユーザーに見せる。
`AskUserQuestion` で「全て承認 / 修正が必要」を確認。修正があれば該当 email_writer を再起動。

### 6. Gmail 下書き作成
承認後、`mcp__claude_ai_Gmail__create_draft` を5回呼ぶ:
- `to`: 各団体のメールアドレス
- `subject`: email_{N}.txt の1行目（Subject: 以降）
- `body`: email_{N}.txt の本文部分

### 7. 下書き確認
`mcp__claude_ai_Gmail__list_drafts` で5件の下書きが存在することを確認し、ユーザーに報告。

## ファイル構成

```
weltify-new/
├── .claude/
│   ├── agents/
│   │   ├── org_finder.md            ← 団体リサーチ担当
│   │   └── email_writer.md          ← 本文カスタマイズ担当
│   ├── outbox/
│   │   ├── outreach-template.txt    ← 共通メール骨格（件名固定・本文にプレースホルダ）
│   │   └── {run_id}/                ← 実行ごとに生成
│   │       ├── orgs.md
│   │       └── email_1.txt … email_5.txt
│   └── settings.local.json
├── comm.md                          ← エージェント間通信ログ
├── plan-summary.html                ← ターゲット戦略（org_finder が参照）
└── src/
    └── email-confirmation.html      ← Weltify トーン参考（email_writer が参照）
```

## エスカレーション規則

- サブエージェントは `AskUserQuestion` を使わない。ユーザーへの確認は必ず `comm.md` に `ESCALATE[...]:` と書く。
- オーケストレーターが `comm.md` を Read して `ESCALATE:` を検出したら `AskUserQuestion` に変換してユーザーへ提示する。
