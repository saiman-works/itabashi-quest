const quest = {
  id: "ankyo_dragon_001",
  appTitle: "板橋クエスト",
  chapterTitle: "第一章：成仏暗渠",
  questTitle: "暗渠の龍を封印せよ",
  questSubtitle: "花壇の願いと暗渠の龍",
  rewardCardTitle: "暗渠の龍封印カード",
  rewardCardDescription: "光が丘公園赤塚口から始まる、暗渠の龍封印の証。",
  stages: [
    {
      id: "stage0_flowers",
      stageNo: 0,
      realName: "光が丘公園 赤塚口",
      gameName: "第零札：花壇の願い",
      type: "request",
      dialogueStartButtonText: "花壇の妖精に話しかける",
      dialogueNextButtonText: "次へ",
      dialogueEndButtonText: "会話を終える",
      fairyImage: "assets/fairy_flower.png",
      introDialogue: [
        { speaker: "花壇の妖精", text: "たいへん、たいへん！" },
        { speaker: "あなた", text: "どうしたの？" },
        { speaker: "花壇の妖精", text: "この先の暗渠で、龍が起きそうなの！" },
        { speaker: "あなた", text: "暗渠ってなに？" },
        { speaker: "花壇の妖精", text: "道の下にかくれている、水の道だよ。" },
        { speaker: "あなた", text: "龍がそこにいるの？" },
        { speaker: "花壇の妖精", text: "うん。だから、札を貼ってしずめてほしいの。" }
      ],
      lat: 35.7697777778,
      lng: 139.6351111111,
      beforeText: "光が丘公園赤塚口の花壇では、地域の人たちが心を込めて花を育てています。花たちが風に揺れながら、小さな声で願いかけてきました。「この先の暗渠に眠る龍を鎮めてください」",
      buttonText: "花たちの願いを聞く",
      afterText: "花たちの願いを受け取った。地図に、暗渠へ向かう気配が浮かび上がった。"
    },
    {
      id: "stage1_tail",
      stageNo: 1,
      realName: "暗渠の始点",
      gameName: "第一札：龍の尾",
      type: "seal",
      lat: 35.7711666667,
      lng: 139.634,
      beforeText: "暗渠の入口にたどり着いた。道の下から、かすかな水音がする。ここが龍の尾の始まりらしい。",
      buttonText: "尾に札を貼る",
      afterText: "尾の札が静かに光った。龍の眠りが少し深くなった。"
    },
    {
      id: "stage2_tail_deep",
      stageNo: 2,
      realName: "暗渠沿いの道",
      gameName: "第二札：尾の奥",
      type: "seal",
      lat: 35.7713888889,
      lng: 139.6336111111,
      beforeText: "龍の尾は、暗渠の下をゆっくり伸びている。まだ水の気配がざわついている。",
      buttonText: "尾の奥を鎮める",
      afterText: "尾の奥が静まった。龍の身体の奥へ、封印の道が続いている。"
    },
    {
      id: "stage3_belly",
      stageNo: 3,
      realName: "暗渠沿いの道",
      gameName: "第三札：龍の腹",
      type: "seal",
      lat: 35.7717777778,
      lng: 139.6335,
      beforeText: "水の記憶が濃くなった。ここは龍の腹にあたる場所らしい。地面の下で、ゆっくりと呼吸している。",
      buttonText: "腹に札を置く",
      afterText: "龍の腹が落ち着いた。花壇へ流れる水の気配が、少し戻ってきた。"
    },
    {
      id: "stage4_claw",
      stageNo: 4,
      realName: "暗渠沿いの道",
      gameName: "第四札：龍の爪",
      type: "seal",
      lat: 35.7721111111,
      lng: 139.6333611111,
      beforeText: "龍の爪が、地中で小さく土をかいている。このままでは、水の道が乱れてしまう。",
      buttonText: "爪を封じる",
      afterText: "爪の動きが止まった。暗渠の龍は、少しずつ眠りへ戻っていく。"
    },
    {
      id: "stage5_back",
      stageNo: 5,
      realName: "暗渠沿いの道",
      gameName: "第五札：龍の背",
      type: "seal",
      lat: 35.7726944444,
      lng: 139.6333611111,
      beforeText: "ここは龍の背。暗渠の流れが、一本の細い龍脈のように続いている。",
      buttonText: "背に札を貼る",
      afterText: "背に札が貼られた。龍の姿が、地図の上ではっきりしてきた。"
    },
    {
      id: "stage6_throat",
      stageNo: 6,
      realName: "暗渠沿いの道",
      gameName: "第六札：龍の喉",
      type: "seal",
      lat: 35.7730277778,
      lng: 139.6330277778,
      beforeText: "龍の喉から、低い水音が聞こえる。もう少しで、龍は静かに目を閉じる。",
      buttonText: "喉を鎮める",
      afterText: "龍の喉が静まった。残るは、龍の頭だけだ。"
    },
    {
      id: "stage7_head",
      stageNo: 7,
      realName: "暗渠沿いの道",
      gameName: "第七札：龍の頭",
      type: "seal",
      lat: 35.7734166667,
      lng: 139.6325555556,
      beforeText: "龍の頭が、暗渠の奥で静かにこちらを見ている。ここまで札を貼ったことで、封印の準備は整った。",
      buttonText: "頭に札をかざす",
      afterText: "龍の頭に札が届いた。しかし、完全に眠らせるには土地の守りの力が必要だ。上赤塚氷川神社へ向かおう。"
    },
    {
      id: "stage8_final",
      stageNo: 8,
      realName: "上赤塚氷川神社",
      gameName: "最終札：完全封印",
      type: "final",
      lat: 35.7755972165,
      lng: 139.6314787217,
      beforeText: "上赤塚氷川神社に着いた。土地の守りの気配が、これまで集めた札に宿っていく。暗渠の龍を、静かに眠りへ戻そう。",
      buttonText: "暗渠の龍を成仏させる",
      afterText: "暗渠の龍は、土の奥へ静かに戻っていった。花壇の花たちが、少しだけ明るく揺れた。成仏完了。"
    }
  ]
};

window.quest = quest;
window.quests = [quest];
console.log("quest loaded", quest);
