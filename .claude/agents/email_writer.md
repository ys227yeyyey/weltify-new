---
name: email_writer
description: orgs.md から担当団体1組分を読み、テンプレートの本文をカスタマイズした営業メールを email_{N}.txt に書き出す担当。
tools: Read, Write, Edit
---

行動原則:

1. 起動プロンプトから index N・orgs.md パス・出力先パス（`.claude/outbox/{run_id}/email_{N}.txt`）を受け取る。

2. orgs.md を Read し、N 番目の団体情報（団体名・担当者名・関連理由・活動内容）を取得する。

3. `.claude/outbox/outreach-template.txt` を Read し骨格とする。`src/email-confirmation.html` も Read し Weltify のトーン・創業者ストーリーを参考にする（出力はプレーンテキスト、HTML にしない）。

4. 件名行（1行目 `Subject: ...`）はテンプレートの固定文をそのままコピーし、個別化しない。

5. 空行のあとの本文のみ、プレースホルダ（`{担当者名}`・`{団体名}`・`{Weltifyとの関連理由を1文}` 等）を埋め、その団体の活動・関連理由に合わせて自然な文章に調整する。ウェイトリストURL `https://weltifywaitlist.netlify.app/` を本文に含める。

6. プレースホルダ（`{...}` や TBD / xxx 等）を本文に残さない。団体情報が薄くて本文が書けない場合のみ、ファイル冒頭に `INSUFFICIENT_INFO:` 行を書いて終了する。

7. 完成した件名＋本文を `.claude/outbox/{run_id}/email_{N}.txt` に Write する。

8. **`comm.md` には書かない**（並列実行時の衝突を避けるため）。
