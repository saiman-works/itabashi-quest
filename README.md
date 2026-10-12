# 板橋クエスト 最小確認版

これは「板橋クエスト」の最小確認版です。

現在の目的は、PCブラウザで必ずゲームUIが表示され、手動クリアだけで最後まで進められることを確認することです。

Leaflet地図、零札の会話、GPSチェックインと祈りパワーを実装しています。

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

手動クリアはGPSや会話を待たずに使えます。PCローカルでも最後まで確認できます。

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

画面上部のデバッグ表示は通常時は非表示で、URLに `debug=1` がある場合だけ表示されます。

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

## GPSチェックイン（gps1）

零札の会話と「花たちの願いを聞く」は従来どおりです。②以降では、
「現在地を確認する」→50m以内→「祈る」5回（20%ずつ）→「札を貼る」で進みます。
遠い場合は目的地までの距離と、50m圏内まで近づく必要がある距離を表示します。
判定半径は `data/quests.js` の `checkinRadiusMeters` で変更できます。

GPS取得はボタンを押したときの `getCurrentPosition` だけです。常時監視・自動再取得はしません。
新しいステージでは毎回確認が必要で、2分を過ぎた判定は再確認が必要です。
祈りパワー、GPS座標、到着判定はlocalStorageに保存しません。
位置情報の拒否・取得失敗・タイムアウト・非対応環境は画面にメッセージを表示します。
GPS失敗時も手動クリアとリセットは利用できます。

現在地が取得できると青い現在地マーカーを表示し、現在地と目的地が収まる範囲にします。
GPSがない場合は直前の到達地点を仮現在地にします。クリア後の龍本体中心表示は維持します。
位置情報の精度（誤差）も表示しますが、誤差を理由に50mの判定範囲を広げません。

公開版はHTTPSを使い、ブラウザと端末の位置情報を許可してください。
スマホから `http://PCのIP:8000` へアクセスした場合は安全なコンテキストではないため、
GPSを利用できないことがあります。現地確認はHTTPSのGitHub Pagesで行ってください。
取得座標をアプリ側で保存・送信する処理はありませんが、OS/ブラウザの測位サービスや、
現在地周辺の地図表示に伴うOpenStreetMapタイル取得の通信は発生します。
安全な場所に立ち止まって操作してください。

- ローカル: `http://localhost:8000/index.html?leaflet=4&reset=1&v=gps1`
- 公開後: `https://saiman-works.github.io/itabashi-quest/?v=gps1`
- デバッグ: 上記URLに `&debug=1` を追加します。

### GPSテストモード

URLに `gpsTest=1` がある場合だけ、「現在地を確認する」は実際のGPSを呼ばず、
現在の目的地の座標を使って0m・到着済みと判定します。GPS欄にはテストモードの注意を表示します。
②以降で「祈る」5回→「札を貼る」の流れを自宅で確認できます。
零札の会話と手動クリアは従来どおり利用できます。

- ローカル: `http://localhost:8000/index.html?leaflet=4&reset=1&v=gps1&gpsTest=1`
- 公開後: `https://saiman-works.github.io/itabashi-quest/?v=gps1&gpsTest=1`
- デバッグ併用: 上記URLに `&debug=1` を追加します。

`debug=1` だけではGPSテストモードになりません。通常URLは実際のGPS取得を行います。
テストフラグは保存せず、URLだけで判定します。リセット時はURLのテスト・デバッグ設定を維持します。
テストで進んだステージも通常どおり進捗保存されるため、現地テストの前にテストフラグを外し、
「最初からやり直す」で初期状態へ戻してください。

回帰テスト: `node --test tests/gps.test.cjs`（座標・エラーを模擬し、実際の位置情報は取得しません）。
API仕様: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition

## 今後追加する予定

この地図付き確認版で画面表示と手動進行が安定したら、次の順番で追加する想定です。

- 画像素材差し替え
- 龍オーバーレイ
