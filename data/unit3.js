window.DATA = window.DATA || {};
// 학습지 3회차의 문장 빈칸은 모양이 바뀐 단어(sways, rising, fangs…)가 정답이에요. ko에 원형을 적어 힌트로 보여줘요.
window.DATA.unit3 = {
  title: "Unit 3 Test",
  words: [
    { en: "yet", ko: "그러나, 그런데도" },
    { en: "remove", ko: "제거하다, 없애다" },
    { en: "movement", ko: "움직임, 움직이는 것" },
    { en: "poison", ko: "독, 독약" },
    { en: "rise", ko: "일어서다, 기립하다" },
    { en: "back and forth", ko: "앞뒤로" },
    { en: "fang", ko: "송곳니" },
    { en: "sway", ko: "(좌우로) 흔들다, 흔들리다" }
  ],
  cloze: [
    { s: "Snake ____ can kill people.", ko: "", a: ["poison"] },
    { s: "The swing ____ softly with the wind.", ko: "원형: sway", a: ["sways"] },
    { s: "Please ____ the stain from that dress.", ko: "", a: ["remove"] },
    { s: "Look! Smoke is ____ from the chimney!", ko: "원형: rise", a: ["rising"] },
    { s: "The yo-yo is swinging ____.", ko: "", a: ["back and forth"] },
    { s: "Some wolves have huge ____.", ko: "원형: fang", a: ["fangs"] },
    { s: "It looked so real. ____ it turned out to be fake.", ko: "원형: yet (문장 첫 단어)", a: ["yet"] },
    { s: "A sudden ____ may scare the snake.", ko: "", a: ["movement"] },
    { s: "Don't touch that bottle. It has ____ in it.", ko: "", a: ["poison"] },
    { s: "The cat watched every ____ of the mouse.", ko: "", a: ["movement"] },
    { s: "She ____ the old paint from the wall yesterday.", ko: "원형: remove", a: ["removed"] },
    { s: "The trees were ____ in the strong wind.", ko: "원형: sway", a: ["swaying"] },
    { s: "The snake showed its sharp ____.", ko: "원형: fang", a: ["fangs"] },
    { s: "The sun ____ in the east every morning.", ko: "원형: rise", a: ["rises"] },
    { s: "The boy ran ____ in the hallway.", ko: "", a: ["back and forth"] },
    { s: "The test was hard. ____ she got a perfect score.", ko: "원형: yet (문장 첫 단어)", a: ["yet"] },
    { s: "Some frogs have ____ on their skin.", ko: "", a: ["poison"] },
    { s: "A vampire has long ____.", ko: "원형: fang", a: ["fangs"] },
    { s: "He will ____ his shoes before entering.", ko: "", a: ["remove"] },
    { s: "Quick ____ can scare the birds away.", ko: "원형: movement", a: ["movements"] },
    { s: "The balloon is ____ into the sky.", ko: "원형: rise", a: ["rising"] },
    { s: "The boat ____ gently on the waves.", ko: "원형: sway", a: ["sways"] },
    { s: "The pendulum moves ____ all day.", ko: "", a: ["back and forth"] },
    { s: "He was tired. ____ he kept running.", ko: "원형: yet (문장 첫 단어)", a: ["yet"] }
  ]
};
