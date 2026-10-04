# 板橋クエスト 最小確認版

これは「板橋クエスト」の最小確認版です。

現在の目的は、PCブラウザで必ずゲームUIが表示され、手動クリアだけで最後まで進められることを確認することです。

現在は、最小確認版に Leaflet 地図表示とステージ地点マーカーを追加した段階です。GPS判定と現在地取得はまだ入れていません。

## 起動方法

このフォルダで簡易Webサーバーを起動します。

```bash
python -m http.server 8000
```

ブラウザで以下を開きます。

```text
http://localhost:8000/index.html
```

## 手動クリアで確認する方法

画面右下の「現在ステージを手動クリア」ボタンを押すと、現在ステージを完了して次のステージに進みます。

9ステージすべてを進めると、報酬カード風のクリア画面が表示されます。

位置情報と画像素材は使っていないため、PCローカルだけで確認できます。

地図には現在進行に合わせてステージ地点が表示されます。②〜⑧の封印地点に進むと龍脈ラインが表示され、②〜⑧をすべて完了するとラインが目立つ表示になります。

## 保存とリセット

進捗は `localStorage` に保存されます。

保存している内容：

- `currentStageIndex`
- `completedStageIds`
- `clearedAt`

「最初からやり直す」ボタンを押すと、保存された進捗を削除して最初から始めます。

開発確認で確実に初期状態から開きたい場合は、URLに `?reset=1` を付けてください。

```text
http://localhost:8000/index.html?reset=1
```

地図付き確認用のURLパラメータと一緒に使う場合は、次のように開けます。

```text
http://localhost:8000/index.html?leaflet=4&reset=1
```

## デバッグ表示

画面上部に一時的なデバッグ表示があります。

- `app loaded`
- `quest loaded`
- `currentStageIndex`
- `completedStageIds`

Consoleにも以下を出します。

- `app init started`
- `quest loaded`
- `render stage`
- `manual clear clicked`
- `app init completed`

## 零札の導入会話

`data/quests.js` の零札にある `introDialogue` で話者とセリフを差し替えられます。
開始・送り・終了の文言は `dialogueStartButtonText`、`dialogueNextButtonText`、
`dialogueEndButtonText` で指定します。会話終了後、依頼を受けるボタンが表示されます。
会話中も開発用の手動クリアは利用できます。

`fairyImage` に指定した `assets/fairy_flower.png` を配置すると妖精画像を表示します。
画像がない場合はピンク色の「花」アイコンに切り替わります。
会話の既読状態はページ内だけで管理します。零札の途中でページを再読み込みすると
会話は未読状態になります。進行済みの場合は保存されたステージから再開します。
「最初からやり直す」は進捗も消去し、零札の会話未読状態に戻ります。

確認URL: `http://localhost:8000/index.html?leaflet=4&reset=1&v=dialogue1`

## 今後追加する予定

この地図付き確認版で画面表示と手動進行が安定したら、次の順番で追加する想定です。

- Geolocation APIによる位置情報判定
- 現在地更新ボタン
- 画像素材差し替え
- 龍オーバーレイ
