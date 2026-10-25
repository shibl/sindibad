import { tr, lang } from './lab-locale.js';
// Lesson 1 experiments: plasma (p. 8), heating ice (pp. 11–12), simple distillation (p. 13).
import { THREE, V, BENCH as B, anim, wait, moveTo, label } from './engine.js';
import * as K from './kit.js';
import { matchTo, lightBurner, offBurner, wp, pour } from './acts.js';
import { emitter, bubbles, stream } from './fx.js';
import { snd } from './sound.js';
import { matte, plastic, FONT } from './materials.js';
import { ROOM } from './room.js';

const fmtT = t => `${t < 0 ? '−' : ''}${Math.abs(t).toFixed(1)}`;

// ───────────────────────── 1. plasma ─────────────────────────
export const plasma = {
  id: 'plasma', section: '2-1', title: tr('حالة البلازما'), subtitle: tr('لهب شمعة في حقل كهربائي'), page: '8–9', tag: tr('حالات المادة'),
  tools: [tr('شمعة مشتعلة'), tr('مصدر توتّر كهربائي عالٍ'), tr('صفيحتان معدنيّتان (قطبان)'), tr('عيدان ثقاب')],
  steps: [
    { t: tr('أُشعل الشمعة وألاحظ شكل اللهب.'), book: false },
    tr('أُعرّضُ لهبَ شمعة مُشتعِلة إلى توتّر كهربائي عالٍ.'),
    tr('أُلاحظُ أنّ اللهب تأثّر بالحقل الكهربائي، ماذا أستنتج؟'),
    { t: tr('أُطفئ مصدر التوتّر العالي، ثمّ الشمعة.'), book: false },
    tr('ما هي البلازما؟'),
  ],
  result: [
    tr('<b>أستنتجُ:</b> أنّ اللهب يتكوّن من دقائق صغيرة مشحونة.'),
    tr('تُعَدّ البلازما تجمّع دقائق صغيرة جداً مشحونة، وتشكّل ما يشبه الغيوم الغازية أو الأشعة المُتأيّنة، وهي الطور الأكثر شيوعاً في الكون. لأنّ اللهب والغمامة الكونيّة والنجوم، والغمامة المُشكّلة للذرّة هي أمثلة عن البلازما.'),
  ],
  view: { pos: [0.05, 1.16, 0.4], target: [-0.06, 1.0, -0.12] },

  build(sc) {
    const o = {};
    // dark board behind the candle, like the book's photographs
    const bd = new THREE.Group();
    const board = K.mesh(new K.RoundedBoxGeometry(0.5, 0.34, 0.012, 2, 0.004), matte(0x121418, 0.92), { receive: true });
    board.position.y = 0.18;
    bd.add(board);
    for (const s of [-1, 1]) {
      const foot = K.mesh(new THREE.BoxGeometry(0.02, 0.012, 0.11), K.M.dark);
      foot.position.set(s * 0.21, 0.006, 0.02);
      bd.add(foot);
    }
    bd.position.set(-0.04, B, -0.3);
    sc.add(bd);

    o.candle = K.candle();
    o.candle.group.position.set(0, B, -0.12);
    sc.add(o.candle.group);
    sc.pickable(o.candle.group, 'candle', tr('شمعة'));

    o.plates = new THREE.Group();
    const terminals = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Group();
      const base = K.mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.008, 24), K.M.dark);
      base.position.y = 0.004;
      e.add(base);
      const post = K.mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.068, 14), K.M.white);
      post.position.y = 0.042;
      e.add(post);
      const plate = K.mesh(new THREE.BoxGeometry(0.0025, 0.058, 0.048), K.M.steel);
      plate.position.set(-s * 0.005, 0.09, 0);
      e.add(plate);
      const lug = K.mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.01, 10), s < 0 ? K.M.red : K.M.black);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(s * 0.007, 0.02, 0);
      e.add(lug);
      e.position.set(s * 0.058, 0, 0);
      o.plates.add(e);
      terminals.push(V(s * 0.058 + s * 0.012, 0.02, 0));
    }
    o.plates.position.set(0, B, -0.12);
    sc.add(o.plates);
    sc.pickable(o.plates, 'plates', tr('القطبان (صفيحتان معدنيّتان)'));

    // high-voltage supply
    const sup = new THREE.Group();
    const box = K.mesh(new K.RoundedBoxGeometry(0.2, 0.11, 0.14, 2, 0.006), plastic(0x2a3038, 0.45), { receive: true });
    box.position.y = 0.055;
    sup.add(box);
    const front = K.plate(0.19, 0.1, (g, w, h) => {
      g.fillStyle = '#d9dde1';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#16324f';
      g.font = `700 34px ${FONT}`;
      g.textAlign = 'right';
      g.direction = lang === 'ar' ? 'rtl' : 'ltr';
      g.fillText(tr('مصدر توتّر عالٍ'), w - 24, 50);
      K.warningSign(g, 80, 92, 92, tr('انتبه توتّر عالي'));
      g.fillStyle = '#111';
      g.font = `500 22px ${FONT}`;
      g.fillText(tr('تشغيل'), w - 70, 200);
      g.direction = 'ltr';
      g.textAlign = 'center';
      g.fillText('+', 250, 236);
      g.fillText('−', 330, 236);
    });
    front.position.set(0, 0.055, 0.0705);
    sup.add(front);
    o.sw = K.mesh(new K.RoundedBoxGeometry(0.022, 0.03, 0.012, 2, 0.003), plastic(0xc1121f, 0.4));
    o.sw.position.set(0.055, 0.06, 0.074);
    o.sw.rotation.x = -0.25;
    sup.add(o.sw);
    o.led = K.mesh(new THREE.SphereGeometry(0.004, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3a1010 }), { cast: false });
    o.led.position.set(0.055, 0.03, 0.072);
    sup.add(o.led);
    const post = (x, mat) => { const p = K.mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 14), mat); p.rotation.x = Math.PI / 2; p.position.set(x, 0.018, 0.076); sup.add(p); return V(x, 0.018, 0.082); };
    const tPlus = post(-0.0, K.M.red), tMinus = post(0.03, K.M.black);
    sup.position.set(-0.3, B, -0.06);
    sup.rotation.y = 0.45;
    sc.add(sup);
    sc.pickable(sup, 'hv', tr('مصدر التوتّر الكهربائي العالي'));
    o.sup = sup;
    sup.updateMatrixWorld(true);
    o.plates.updateMatrixWorld(true);
    const a = wp(sup, tPlus), b = wp(sup, tMinus);
    const ea = wp(o.plates, terminals[0]), eb = wp(o.plates, terminals[1]);
    const lay = (p, y = B + 0.003) => V(p.x, y, p.z);
    sc.add(K.cable([a, a.clone().add(V(0.02, -0.01, 0.04)), lay(a.clone().add(V(0.04, 0, 0.08))), lay(V(-0.12, 0, -0.02)), lay(ea.clone().add(V(-0.04, 0, 0.03))), ea], 0xc1121f));
    sc.add(K.cable([b, b.clone().add(V(0.02, -0.01, 0.04)), lay(b.clone().add(V(0.05, 0, 0.1))), lay(V(0.0, 0, 0.05)), lay(eb.clone().add(V(0.05, 0, 0.03))), eb], 0x1d1f22));

    o.mb = K.matchbox();
    o.mb.group.position.set(0.19, B, 0.0);
    o.mb.group.rotation.y = -0.4;
    sc.add(o.mb.group);
    sc.pickable(o.mb.group, 'matches', tr('علبة الثقاب'));

    o.smoke = emitter(sc, { n: 24, color: 0x9aa0a6, opacity: 0.25, size: [0.008, 0.05], life: 2.2, rise: 0.04, spread: 0.003, origin: () => V(0, B + 0.066, -0.12) });
    return o;
  },

  async run(lab, o) {
    const fl = o.candle.flame;
    lab.step(0);
    await lab.do(tr('أشعل الشمعة بعود ثقاب.'), ['matches', 'candle']);
    const back = await matchTo(o.mb, V(0, B + o.candle.top + 0.012, -0.12), { hold: 0.3 });
    fl.set(true);
    anim(0.8, k => fl.setLevel(0.25 + 0.75 * k));
    await back();
    lab.watch(tr('لاحظ شكل لهب الشمعة قبل تطبيق التوتّر الكهربائي.'));
    await lab.wait(1.6);
    await lab.ask({
      q: tr('كيف يبدو اللهب قبل تطبيق التوتّر الكهربائي العالي؟'),
      opts: [tr('منتصب ومستقيم نحو الأعلى'), tr('منحرف نحو أحد القطبين'), tr('متفرّع إلى ألسنة جانبية'), tr('يتذبذب بين القطبين')],
      right: 0, why: tr('قبل تطبيق التوتّر الكهربائي العالي يكون لهب الشمعة منتصباً ومستقيماً نحو الأعلى.'),
    });
    lab.log(tr('قبل تطبيق التوتّر الكهربائي: اللهب منتصب ومستقيم نحو الأعلى.'));

    lab.step(1);
    await lab.do(tr('شغّل مصدر التوتّر الكهربائي العالي من مفتاحه.'), 'hv', { unsafe: { plates: tr('لا تلمس القطبين. شغّل المصدر من مفتاحه فقط.') } });
    snd.switch();
    o.sw.rotation.x = 0.25;
    o.led.material.color.setHex(0xff2a2a);
    snd.hum(true);
    await anim(1.2, k => { fl.mat.uniforms.uBend.value = 0.62 * k; fl.mat.uniforms.uSpread.value = 0.75 * k; });
    lab.watch(tr('لاحظ ما يحدث للهب الآن.'));
    await lab.wait(2.2);
    await lab.ask({
      q: tr('ماذا حدث للهب عند تطبيق التوتّر الكهربائي العالي؟'),
      opts: [tr('تأثّر اللهب بالحقل الكهربائي فانحرف وتشوّه وانتشر جانبياً'), tr('بقي اللهب منتصباً كما هو'), tr('انطفأ اللهب فوراً'), tr('ازداد طول اللهب نحو الأعلى فقط')],
      right: 0, why: tr('أُلاحظُ أنّ اللهب تأثّر بالحقل الكهربائي.'),
    });
    lab.log(tr('عند تطبيق التوتّر الكهربائي العالي: تأثّر اللهب بالحقل الكهربائي فانحرف وانتشر جانبياً.'));

    lab.step(2);
    await lab.ask({
      q: tr('أُلاحظُ أنّ اللهب تأثّر بالحقل الكهربائي، ماذا أستنتج؟'),
      opts: [tr('أنّ اللهب يتكوّن من دقائق صغيرة مشحونة'), tr('أنّ اللهب يتكوّن من جزيئات متعادلة كهربائياً فقط'), tr('أنّ الحقل الكهربائي يُطفئ الاحتراق'), tr('أنّ الشمعة مادة ناقلة للتيار الكهربائي')],
      right: 0, why: tr('<b>أستنتجُ:</b> أنّ اللهب يتكوّن من دقائق صغيرة مشحونة.'),
    });
    lab.log(tr('أستنتج: اللهب يتكوّن من دقائق صغيرة مشحونة.'));

    lab.step(3);
    await lab.do(tr('أطفئ مصدر التوتّر العالي قبل أن تقترب من القطبين.'), 'hv', {
      unsafe: { plates: tr('المصدر ما زال يعمل. أطفئ مصدر التوتّر العالي قبل الاقتراب من القطبين.'), candle: tr('المصدر ما زال يعمل. أطفئه أولاً قبل أن تمدّ يدك بين القطبين.') },
    });
    snd.switch();
    snd.hum(false);
    o.sw.rotation.x = -0.25;
    o.led.material.color.setHex(0x3a1010);
    await anim(0.8, k => { fl.mat.uniforms.uBend.value = 0.62 * (1 - k); fl.mat.uniforms.uSpread.value = 0.75 * (1 - k); });
    lab.log(tr('بعد إطفاء المصدر: عاد اللهب منتصباً.'));
    await lab.do(tr('أطفئ الشمعة.'), 'candle');
    await anim(0.35, k => fl.setLevel(1 - k));
    fl.set(false);
    o.smoke.rate = 8;
    setTimeout(() => { o.smoke.rate = 0; }, 1500);

    lab.step(4);
    await lab.ask({
      q: tr('عند توليد التيار الكهربائي المُتناوِب في سورية يرفع التوتّر إلى {{66000 V}}، وهذا يؤدّي إلى تأيّن الغازات المُحيطة بخطوط النقل، ويصبح الهواء ناقلاً للتيار الكهربائي، ممّا يؤدّي إلى أذية أي كائن حيّ يقترب من التوتّر العالي. ماذا أستنتج؟'),
      opts: [tr('إنّ الهواء تحوّل إلى غازات متأيّنة'), tr('إنّ الهواء تحوّل إلى الحالة السائلة'), tr('إنّ خطوط النقل تمتصّ الهواء'), tr('إنّ الهواء لا يتأثّر بالتوتّر العالي')],
      right: 0, why: tr('<b>أستنتج:</b> إنّ الهواء تحوّل إلى غازات متأيّنة.'),
    });
    await lab.ask({
      q: tr('يمكن أن تتكوّن المادة من تجمُّع دقائق صغيرة جداً مشحونة، وتشكّل ما يشبه الغيوم الغازية أو الأشعة المُتأيّنة. ماذا تسمّى المادة في هذه الحالة؟'),
      opts: [tr('البلازما'), tr('الغاز'), tr('البخار'), tr('السائل')],
      right: 0, why: tr('تسمّى المادة في هذه الحالة <b>البلازما</b>.'),
    });
    await lab.ask({
      q: tr('أيّ ممّا يأتي أمثلة عن البلازما؟'),
      opts: [tr('اللهب'), tr('النجوم'), tr('الغمامة الكونيّة'), tr('الغمامة المُشكّلة للذرّة'), tr('قطعة جليد'), tr('بخار الماء')],
      right: [0, 1, 2, 3], why: tr('اللهب والغمامة الكونيّة والنجوم، والغمامة المُشكّلة للذرّة هي أمثلة عن البلازما.'),
    });
    await lab.ask({
      kicker: tr('نشاط (2)'),
      q: tr('إنّ الجسيمات المُشكّلة للبلازما تستجيب للحقول المغناطيسية والكهربائية، فسِّر ذلك.'),
      opts: [tr('لأنّها دقائق مشحونة'), tr('لأنّها دقائق متعادلة كهربائياً'), tr('لأنّها في الحالة الصلبة'), tr('لأنّها دقائق كبيرة الكتلة')],
      right: 0, ours: true, why: tr('البلازما تجمّع دقائق صغيرة جداً <b>مشحونة</b>، والدقائق المشحونة تتأثّر بالحقول الكهربائية والمغناطيسية، كما تأثّر لهب الشمعة بالحقل الكهربائي.'),
    });
    await lab.ask({
      kicker: tr('إثراء'),
      q: tr('تُحيط بكرتنا الأرضية طبقة من الغازات المتأيّنة على ارتفاع يبدأ من {{70 km}} إلى حوالي {{450 km}} عن سطح الأرض. ما اسمها؟'),
      opts: [tr('الأيونوسفير'), tr('طبقة الأوزون'), tr('التروبوسفير'), tr('الغلاف المائي')],
      right: 0, why: tr('تكوّن هذه الغازات المتأيّنة طبقة <b>الأيونوسفير</b> التي تتكوّن من البلازما.'),
    });
    await lab.book({ title: tr('نتيجة'), page: 9, html: plasma.result[1] });
  },
};

// ───────────────────────── 2. heating ice ─────────────────────────
export const ice = {
  id: 'ice', section: '1-3-1', title: tr('عتبة التغيّرات الفيزيائية'), subtitle: tr('تسخين الجليد حتى الغليان'), page: '11–12', tag: tr('تغيّر فيزيائي'),
  tools: [tr('قطع من الجليد'), tr('كأس زجاجية'), tr('ميزان حرارة'), tr('حامل وماسك'), tr('حمّام مائي'), tr('حامل ثلاثي القوائم'), tr('موقد بنزن')],
  steps: [
    tr('خُذ قطعاً من الجليد، وضعها في دورق، كما في الشكل، وضعْ ميزان حرارة مُناسِب.'),
    tr('ضَعِ الدورق فوق موقد حراري، ولاحِظ ارتفاع درجة الحرارة تدريجياً.'),
    tr('دوّن ملاحظاتك حول: حالة الماء قبل بلوغ درجة الحرارة [[0]]°C، حالة الماء عند درجة الحرارة 0°C، دلالة ميزان الحرارة في أثناء تحول الماء من الحالة الصلبة إلى السائل.'),
    tr('استمِرّ بالتسخين، و دوِّن ملاحظاتك حول: حالة الماء قبل الدرجة 100°C، حالة الماء عند بلوغ الدرجة 100°C، دلالة ميزان الحرارة في أثناء تحوُّل الماء من الحالة السائلة إلى البخارية.'),
    tr('فسّر ثبات درجة الحرارة في أثناء التحوّل من حالة إلى أخرى.'),
  ],
  result: [
    tr('إنّ الطاقة الحرارية تعملُ على إضعاف الترابط بين دقائق المادة، وتُغيّر الحالة الفيزيائية للمادة من الحالة الصلبة إلى الحالة السائلة، تُدعى هذه الفترة بعتبة الانصهار، وتُدعى درجة الحرارة عندئذٍ درجة الانصهار.'),
    tr('إنَّ الطاقة الحرارية تعملُ على تحطيم الترابط بين دقائق المادة، وتُغيّر الحالة الفيزيائية للمادة من الحالة السائلة إلى الحالة الغازية، تُدعى هذه الفترة بعتبة الغليان، وتُدعى درجة الحرارة عندئذٍ درجة الغليان.'),
  ],
  view: { pos: [0.12, 1.33, 0.56], target: [0.03, 1.12, -0.1] },

  build(sc) {
    const o = {};
    o.stand = K.stand({ h: 0.52 });
    o.stand.group.position.set(-0.17, B, -0.03);
    sc.add(o.stand.group);
    o.stand.clamp(0.29, 0.166, Math.PI / 2, 0.029);
    o.stand.clamp(0.445, 0.17, Math.PI / 2, 0.0045);
    sc.pickable(o.stand.group, 'stand', tr('حامل معدني مع ماسكين'));

    o.tri = K.tripod({ h: 0.2 });
    o.tri.group.position.set(0, B, -0.1);
    sc.add(o.tri.group);
    sc.pickable(o.tri.group, 'tripod', tr('حامل ثلاثي القوائم وشبكة'));
    o.burner = K.bunsen({ hose: V(-0.06, 0, -0.27) });
    o.burner.group.position.set(0, B, -0.1);
    sc.add(o.burner.group);
    sc.pickable(o.burner.group, 'burner', tr('موقد بنزن'));

    o.bath = K.beaker({ r: 0.052, h: 0.07, grad: false });
    o.bath.group.position.set(0, B + o.tri.top, -0.1);
    o.bath.liquid.set(0.046);
    sc.add(o.bath.group);
    sc.pickable(o.bath.group, 'bath', tr('حمّام مائي'));

    o.cup = K.beaker({ r: 0.028, h: 0.08 });
    o.cup.group.position.set(0.2, B, 0.05);
    sc.add(o.cup.group);
    sc.pickable(o.cup.group, 'beaker', tr('كأس زجاجية'));
    o.cupAt = V(0, B + o.tri.top + 0.013, -0.1);

    o.th = K.thermometer({ L: 0.26 });
    o.th.group.position.set(0.08, B + 0.0036, 0.15);
    o.th.group.rotation.z = Math.PI / 2;
    o.th.group.rotation.y = 0.2;
    sc.add(o.th.group);
    sc.pickable(o.th.group, 'thermo', tr('ميزان حرارة'));
    o.thAt = V(0.004, o.cupAt.y + 0.005, -0.1);

    o.dish = K.dish({ r: 0.052, h: 0.03 });
    o.dish.group.position.set(0.33, B, -0.07);
    sc.add(o.dish.group);
    o.cubes = [];
    for (let i = 0; i < 9; i++) {
      const c = K.iceCube(0.016);
      const a = i * 2.4, r = i ? 0.02 + (i % 2) * 0.012 : 0;
      c.position.set(Math.cos(a) * r, o.dish.bottom + 0.0085 + (i > 6 ? 0.014 : 0), Math.sin(a) * r);
      c.rotation.set(Math.random(), Math.random() * 3, Math.random());
      o.dish.group.add(c);
      o.cubes.push(c);
    }
    sc.pickable(o.dish.group, 'ice', tr('قطع من الجليد'));

    o.bubbles = bubbles(o.cup.group, { n: 50, size: 0.0014, speed: 0.06, area: () => ({ x: 0, z: 0, r: 0.02, y0: o.cup.bottom + 0.003, y1: o.cup.liquid.level }) });
    o.bathBubbles = bubbles(o.bath.group, { n: 30, size: 0.0014, speed: 0.06, area: () => ({ x: 0, z: 0, r: 0.045, y0: o.bath.bottom + 0.003, y1: o.bath.liquid.level }) });
    o.steam = emitter(sc, { n: 36, color: 0xd8dee6, opacity: 0.3, size: [0.012, 0.08], life: 2.6, rise: 0.07, spread: 0.03, origin: () => V(0.004, o.cupAt.y + 0.075, -0.1) });
    return o;
  },

  async run(lab, o) {
    const sc = lab.sc;
    lab.step(0);
    await lab.do(tr('ضع الكأس الزجاجية في الحمّام المائي، وثبّتها بالماسك.'), 'beaker');
    await moveTo(o.cup.group, o.cupAt, 1.1, { lift: 0.18 });
    snd.glass();
    await lab.do(tr('خُذ قطعاً من الجليد، وضعها في الكأس.'), 'ice');
    const spots = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spots.push(V(Math.cos(a) * 0.0135, 0.0105, Math.sin(a) * 0.0135)); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; spots.push(V(Math.cos(a) * 0.012, 0.027, Math.sin(a) * 0.012)); }
    for (let i = 0; i < 9; i++) {
      const c = o.cubes[i];
      o.cup.group.attach(c);
      moveTo(c, spots[i], 0.55, { lift: 0.08 });
      await wait(0.09);
    }
    await wait(0.6);
    snd.place();
    await lab.do(tr('ضع ميزان الحرارة في الكأس، وثبّته بالماسك العلوي.'), 'thermo');
    await moveTo(o.th.group, o.thAt, 1.2, { lift: 0.3, rot: new THREE.Euler(0, 0, 0) });
    snd.glass();
    const T0 = -30;
    o.th.set(T0);
    const read = label(o.th.group, V(0, o.th.L + 0.03, 0), 'reading');
    read.set(`${fmtT(T0)} °C`);
    lab.cleanup(() => read.remove());
    lab.log(tr(`درجة حرارة الجليد في البداية: [[${fmtT(T0)}]] °C`));

    // ── simulation: constant heating power ──
    const S = { t: 0, T: T0, ice: 60, water: 0, vap: 0, on: false, meltStart: null, meltEnd: null, boilStart: null };
    const M0 = S.ice, P = 400, area = Math.PI * o.cup.inR ** 2;
    const ch = lab.chart({ title: tr('درجة الحرارة مع الزمن'), yMin: -40, yMax: 120, yStep: 20, xMax: 60 });
    let lastPush = -1;
    sc.onFrame((dt, sdt) => {
      if (S.on && sdt > 0) {
        let q = P * sdt;
        S.t += sdt;
        for (let guard = 0; q > 1e-9 && guard < 6; guard++) {
          if (S.ice > 0 && S.T < 0) {
            const need = S.ice * 2.1 * -S.T;
            if (q >= need) { S.T = 0; q -= need; } else { S.T += q / (S.ice * 2.1); q = 0; }
          } else if (S.ice > 0) {
            if (S.meltStart === null) S.meltStart = S.t;
            const m = Math.min(S.ice, q / 334);
            S.ice -= m; S.water += m; q -= m * 334;
            if (S.ice < 1e-4) { S.ice = 0; S.meltEnd = S.t; }
          } else if (S.T < 100) {
            const need = S.water * 4.18 * (100 - S.T);
            if (q >= need) { S.T = 100; q -= need; } else { S.T += q / (S.water * 4.18); q = 0; }
          } else {
            if (S.boilStart === null) S.boilStart = S.t;
            const m = q / 2260;
            S.water -= m; S.vap += m; q = 0;
          }
        }
        if (S.t - lastPush > 0.5) { lastPush = S.t; ch.push(S.t, S.T); }
      }
      // visuals
      const f = S.ice / M0;
      o.cubes.forEach((c, i) => {
        const s = 0.016 * Math.cbrt(Math.max(0, f - i * 0.006));
        c.visible = s > 0.002;
        c.scale.setScalar(Math.max(0.0001, s));
        c.position.y = o.cup.bottom + s * 0.6 + (i >= 6 ? s : 0);
      });
      const lev = o.cup.bottom + (S.water / 1) / (area * 1e6);
      o.cup.liquid.set(lev);
      const disp = S.T + (S.on ? Math.sin(performance.now() / 300) * 0.04 : 0);
      o.th.set(S.T);
      read.set(`${fmtT(disp)} °C`);
      ch.val(`${fmtT(S.T)} °C`);
      const hot = S.ice === 0 ? Math.max(0, (S.T - 92) / 8) : 0;
      o.bubbles.rate = S.on ? (S.T >= 100 ? 1.4 : hot * 0.25) : 0;
      o.bathBubbles.rate = S.on ? hot * 0.6 : 0;
      o.steam.rate = S.on && S.T >= 99 ? 9 : S.T > 80 ? 1.5 : 0;
      if (S.T >= 100 && S.on) snd.boil(true); else snd.boil(false);
    });
    lab.cleanup(() => snd.boil(false));

    lab.step(1);
    await lab.do(tr('أشعل موقد بنزن تحت الحمّام المائي، ولاحظ ارتفاع درجة الحرارة.'), 'burner');
    await lightBurner(o.burner);
    S.on = true;
    lab.sim(true);
    lab.watch(tr('راقب ميزان الحرارة والخطّ البياني. يمكنك تسريع الزمن من الأسفل.'));

    lab.step(2);
    await lab.until(() => S.T >= -12);
    await lab.ask({
      q: tr('ما حالة الماء قبل بلوغ درجة الحرارة {{0 °C}}؟'),
      opts: [tr('صلبة (جليد)'), tr('سائلة'), tr('غازية'), tr('صلبة وسائلة معاً')],
      right: 0, why: tr('قبلَ بلوغ الدَّرجة {{0 °C}} الماء حالته صلبة (جليد).'),
    });
    lab.log(tr('قبل بلوغ [[0]] °C: الماء في الحالة الصلبة (جليد).'));
    await lab.until(() => S.ice <= M0 * 0.62);
    await lab.ask({
      q: tr('ما حالة الماء عند درجة الحرارة {{0 °C}}؟'),
      opts: [tr('يبدأ بالانصهار، ويكون في الحالتين الصلبة والسائلة'), tr('سائلة فقط'), tr('صلبة فقط'), tr('يتحوّل مباشرة إلى بخار')],
      right: 0, why: tr('عند بلوغ الدرجة {{0 °C}} يبدأ بالانصهار ويكون في الحالتين الصلبة والسائلة.'),
    });
    await lab.ask({
      q: tr('ما دلالة ميزان الحرارة في أثناء تحوّل الماء من الحالة الصلبة إلى السائلة؟'),
      opts: [tr('تبقى درجة الحرارة ثابتة حتى ينصهر الجليد بكامله'), tr('ترتفع درجة الحرارة بانتظام'), tr('تنخفض درجة الحرارة'), tr('ترتفع ثمّ تنخفض')],
      right: 0, why: tr('تبقى درجة الحرارة ثابتة عند {{0 °C}} حتى ينصهر الجليد بكامله.'),
    });
    lab.log(tr('عند [[0]] °C: يبدأ الجليد بالانصهار، ويكون الماء في الحالتين الصلبة والسائلة، وتبقى درجة الحرارة ثابتة حتى ينصهر الجليد بكامله.'));

    lab.step(3);
    await lab.until(() => S.ice === 0 && S.T >= 55);
    await lab.ask({
      q: tr('ما حالة الماء قبل الدرجة {{100 °C}}؟'),
      opts: [tr('سائلة، وتبدأ درجة حرارتها بالارتفاع تدريجياً'), tr('صلبة'), tr('غازية'), tr('سائلة، ودرجة حرارتها ثابتة')],
      right: 0, why: tr('تبدأ درجة حرارة الماء السائل بالارتفاع تدريجياً حتى الدرجة {{100 °C}}.'),
    });
    lab.log(tr('بعد انصهار الجليد كلّه: ترتفع درجة حرارة الماء السائل تدريجياً حتى [[100]] °C.'));
    await lab.until(() => S.vap >= 2.2);
    await lab.ask({
      q: tr('ماذا يحدث للماء عند بلوغ الدرجة {{100 °C}}؟'),
      opts: [tr('يبدأ بالتحوّل إلى الحالة البخارية'), tr('يتجمّد'), tr('يبقى سائلاً دون أيّ تغيّر'), tr('ينصهر')],
      right: 0, why: tr('يبدأ الماء السائل بالتحوّل إلى الحالة البخارية عند بلوغ الدرجة {{100 °C}}.'),
    });
    await lab.ask({
      q: tr('ما دلالة ميزان الحرارة في أثناء تحوّل الماء من الحالة السائلة إلى البخارية؟'),
      opts: [tr('تبقى درجة الحرارة ثابتة حتى يتبخّر الماء بكامله'), tr('ترتفع درجة الحرارة فوق 100 °C فوراً'), tr('تنخفض درجة الحرارة'), tr('تتذبذب درجة الحرارة')],
      right: 0, why: tr('تبقى درجة الحرارة ثابتة عند {{100 °C}} حتى يتبخّر الماء بكامله.'),
    });
    lab.log(tr('عند [[100]] °C: يبدأ الماء بالتحوّل إلى بخار، وتبقى درجة الحرارة ثابتة.'));
    await lab.until(() => S.vap >= 4.5);
    lab.sim(false);
    await lab.do(tr('يكفي هذا. أطفئ موقد بنزن.'), 'burner');
    await offBurner(o.burner);
    S.on = false;
    ch.push(S.t, S.T, true);

    lab.step(4);
    ch.tag(S.meltStart, S.meltEnd ?? S.t, 0, tr('؟'));
    ch.tag(S.boilStart ?? S.t, S.t, 100, tr('؟'));
    await lab.ask({
      q: tr('فسّر ثبات درجة الحرارة في أثناء التحوّل من الحالة الصلبة إلى الحالة السائلة.'),
      opts: [tr('الطاقة الحرارية تعمل على إضعاف الترابط بين دقائق المادة، فتتغيّر حالتها الفيزيائية'), tr('الموقد يتوقّف عن التسخين في هذه الفترة'), tr('الطاقة الحرارية تعمل على تحطيم الترابط بين دقائق المادة كلّياً'), tr('يتغيّر التركيب الكيميائي للماء')],
      right: 0, why: tr('إنّ الطاقة الحرارية تعملُ على <b>إضعاف</b> الترابط بين دقائق المادة، وتُغيّر الحالة الفيزيائية للمادة من الحالة الصلبة إلى الحالة السائلة.'),
    });
    await lab.ask({
      q: tr('ماذا تُدعى الفترة الأفقية من الخطّ البياني عند {{0 °C}}؟'),
      opts: [tr('عتبة الانصهار'), tr('عتبة الغليان'), tr('درجة الانصهار'), tr('درجة الغليان')],
      right: 0, why: tr('تُدعى هذه الفترة <b>بعتبة الانصهار</b>.'),
    });
    ch.retag(0, tr('عتبة الانصهار'));
    await lab.ask({
      q: tr('وماذا تُدعى درجة الحرارة {{0 °C}} عندئذٍ؟'),
      opts: [tr('درجة الانصهار'), tr('درجة الغليان'), tr('عتبة الانصهار'), tr('درجة التكاثف')],
      right: 0, why: tr('تُدعى درجة الحرارة عندئذٍ <b>درجة الانصهار</b>.'),
    });
    await lab.ask({
      q: tr('فسّر ثبات درجة الحرارة في أثناء التحوّل من الحالة السائلة إلى الحالة البخارية.'),
      opts: [tr('الطاقة الحرارية تعمل على تحطيم الترابط بين دقائق المادة، فتتحوّل من الحالة السائلة إلى الغازية'), tr('الطاقة الحرارية تعمل على إضعاف الترابط فقط، فتبقى المادة سائلة'), tr('الماء يفقد طاقته الحرارية'), tr('يتحلّل الماء إلى هدروجين وأكسجين')],
      right: 0, why: tr('إنَّ الطاقة الحرارية تعملُ على <b>تحطيم</b> الترابط بين دقائق المادة، وتُغيّر الحالة الفيزيائية للمادة من الحالة السائلة إلى الحالة الغازية.'),
    });
    await lab.ask({
      q: tr('ماذا تُدعى الفترة الأفقية عند {{100 °C}}؟ وماذا تُدعى درجة الحرارة عندئذٍ؟'),
      opts: [tr('عتبة الغليان، ودرجة الغليان'), tr('عتبة الانصهار، ودرجة الانصهار'), tr('عتبة الغليان، ودرجة الانصهار'), tr('درجة الغليان، وعتبة التبخّر')],
      right: 0, why: tr('تُدعى هذه الفترة <b>بعتبة الغليان</b>، وتُدعى درجة الحرارة عندئذٍ <b>درجة الغليان</b>.'),
    });
    ch.retag(1, tr('عتبة الغليان'));
    await lab.ask({
      kicker: tr('إضاءة · ص 12'),
      q: tr('درجة غليان المادة هي درجة الحرارة التي يتساوى عندها ضغط بخارها مع الضغط الجوي. إذا انخفض الضغط الجوي، فإنّ درجة الغليان:'),
      opts: [tr('تنخفض'), tr('ترتفع'), tr('لا تتغيّر'), tr('تصبح 0 °C')],
      right: 0, why: tr('إذا ازداد الضغط ترتفع درجة الغليان، وإذا انخفض الضغط تنخفض درجة الغليان. وقيمة درجة الغليان النظامية للماء النقي {{100 °C}}.'),
    });
    await lab.book({ title: tr('أُلاحظ'), page: 12, html: tr('1. قبلَ بلوغ الدَّرجة {{0 °C}} الماء حالته صلبة (جليد)، وعند بلوغ الدرجة {{0 °C}} يبدأ بالانصهار ويكون في الحالتين الصلبة والسائلة، و تبقى درجة الحرارة ثابتة حتى ينصهر الجليد بكامله.<br>2. تبدأ درجة حرارة الماء السائل بالارتفاع تدريجياً حتى الدرجة {{100 °C}}.<br>3. يبدأ الماء السائل بالتحوّل إلى الحالة البخارية عند بلوغ الدرجة {{100 °C}}، وتبقى درجة الحرارة ثابتة حتى يتبخّر الماء بكامله.') });
  },
};

// ───────────────────────── 3. simple distillation ─────────────────────────
export const distill = {
  id: 'distill', section: '2-3-1', title: tr('أهمّية التغيّرات الفيزيائية'), subtitle: tr('التقطير البسيط لمحلول ملحي'), page: '13', tag: tr('تغيّر فيزيائي'),
  tools: [tr('دورق التقطير'), tr('محلول ملحي'), tr('ميزان حرارة'), tr('مكثّف'), tr('دورق الاستقبال'), tr('موقد بنزن'), tr('حاملان'), tr('خرطوما ماء')],
  steps: [
    { t: tr('أُركّب جهاز التقطير كما في الشكل: دورق التقطير وفيه المحلول الملحي، ميزان الحرارة، المكثّف، دورق الاستقبال.'), book: false },
    { t: tr('أَصِل ماء التبريد: يدخل الماء البارد من أسفل المكثّف ويخرج من أعلاه.'), book: false },
    tr('أُسخّن محلولاً ملحياً، أُلاحظ تبخّر الماء، وتبقّي الملح في حالةٍ صلبة.'),
    tr('أُبرّد البخار، فيتحوّل إلى حالةٍ سائلة، فأُسمّي هذا النوع من التقطير تقطيراً بسيطاً.'),
    tr('كيف نَفصِل مكوّناتِ خليط من المواد السائلة، اعتماداً على اختلاف درجة غليان كلٍّ منها؟'),
  ],
  result: [
    tr('أُسخّن محلولاً ملحياً، أُلاحظ تبخّر الماء، وتبقّي الملح في حالةٍ صلبة. أُبرّد البخار، فيتحوّل إلى حالةٍ سائلة، فأُسمّي هذا النوع من التقطير تقطيراً بسيطاً.'),
    tr('أسخّن خليطاً من المواد السائلة، فأُلاحظ تبخّر المواد على مراحل تبعاً لدرجة غليان كلٍّ منها من الأدنى إلى الأعلى. أسمّي هذا النوع من التقطير، تقطيراً تجزيئياً.'),
  ],
  view: { pos: [0.02, 1.4, 0.82], target: [0.02, 1.14, -0.1] },

  build(sc) {
    const o = {};
    const fx = 0.24, fz = -0.1;
    o.tri = K.tripod({ h: 0.2 });
    o.tri.group.position.set(fx, B, fz);
    sc.add(o.tri.group);
    o.burner = K.bunsen({ hose: V(0.06, 0, -0.27) });
    o.burner.group.position.set(fx, B, fz);
    sc.add(o.burner.group);
    sc.pickable(o.burner.group, 'burner', tr('موقد بنزن'));

    o.flask = K.rbFlask({ R: 0.045, rn: 0.012, neck: 0.09, arm: { y: 0.1434, angle: 0.35, len: 0.07 } });
    o.flask.group.position.set(fx, B + o.tri.top, fz);
    sc.add(o.flask.group);
    sc.pickable(o.flask.group, 'flask', tr('دورق التقطير'));

    o.standA = K.stand({ h: 0.5 });
    o.standA.group.position.set(fx + 0.15, B, fz + 0.07);
    sc.add(o.standA.group);
    o.standA.clamp(o.tri.top + o.flask.yj + 0.04, 0.146, -Math.PI / 2, 0.012);

    o.flask.group.updateMatrixWorld(true);
    const armEnd = wp(o.flask.group, o.flask.armEnd), dir = o.flask.armDir.clone();
    o.cond = K.condenser({ L: 0.34 });
    const ang = Math.atan2(-dir.y, -dir.x);
    o.condAt = { p: armEnd.clone().addScaledVector(dir, 0.17 + 0.05), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, ang)) };
    o.outlet = o.condAt.p.clone().addScaledVector(dir, 0.17 + 0.05);
    o.cond.group.position.set(-0.02, B + 0.017, 0.14);
    o.cond.group.rotation.x = Math.PI / 2;
    sc.add(o.cond.group);
    sc.pickable(o.cond.group, 'condenser', tr('المكثّف'));

    o.standB = K.stand({ h: 0.42 });
    o.standB.group.position.set(o.condAt.p.x, B, fz - 0.1 + 0.07);
    sc.add(o.standB.group);
    o.standB.clamp(o.condAt.p.y - B, 0.096, 0, 0.0165);

    o.block = K.mesh(new K.RoundedBoxGeometry(0.1, 0.03, 0.1, 2, 0.003), matte(0xa77b4f, 0.65), { receive: true });
    o.block.position.set(o.outlet.x - 0.004, B + 0.015, fz);
    sc.add(o.block);
    o.recv = K.erlenmeyer({ R: 0.04, rn: 0.013, H: 0.13 });
    o.recv.group.position.set(-0.47, B, 0.07);
    sc.add(o.recv.group);
    sc.pickable(o.recv.group, 'receiver', tr('دورق الاستقبال'));
    o.recvAt = V(o.outlet.x - 0.004, B + 0.03, fz);

    o.th = K.thermometer({ L: 0.26 });
    o.th.group.position.set(0.0, B + 0.0036, 0.2);
    o.th.group.rotation.set(0, 0.1, Math.PI / 2);
    sc.add(o.th.group);
    sc.pickable(o.th.group, 'thermo', tr('ميزان حرارة'));
    o.thAt = V(fx, B + o.tri.top + 0.1434 - 0.012, fz);
    o.stop = K.stopper({ r0: 0.0095, r1: 0.0115, h: 0.02 });
    o.stop.group.visible = false;
    o.stop.group.position.set(fx, B + o.tri.top + o.flask.top - 0.012, fz);
    sc.add(o.stop.group);

    o.salt = K.bottle({ name: tr('محلول ملحي'), formula: 'NaCl(aq)', color: '#0e7490', content: { color: 0xdcecf3, opacity: 0.52 }, contentLevel: 0.7 });
    o.salt.group.position.set(0.47, B, 0.05);
    o.salt.group.rotation.y = -0.3;
    sc.add(o.salt.group);
    sc.pickable(o.salt.group, 'salt', tr('محلول ملحي (ماء وملح)'));

    // salt crystals left in the flask
    const cg = new THREE.BoxGeometry(1, 1, 1);
    o.crystals = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.4 }), 90);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const Ri = 0.045 - 0.002;
    for (let i = 0; i < 90; i++) {
      const r = Math.sqrt(Math.random()) * 0.03, a = Math.random() * 6.28;
      const y = 0.045 - Math.sqrt(Ri * Ri - r * r) + 0.0015;
      q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
      m4.compose(V(Math.cos(a) * r, y, Math.sin(a) * r), q, V(1, 1, 1).multiplyScalar(0.0012 + Math.random() * 0.0022));
      o.crystals.setMatrixAt(i, m4);
    }
    o.crystals.count = 0;
    o.flask.group.add(o.crystals);

    o.bubbles = bubbles(o.flask.group, { n: 50, size: 0.0016, speed: 0.06, area: () => ({ x: 0, z: 0, r: 0.022, y0: 0.006, y1: o.flask.liquid.level }) });
    o.stream = stream(sc);
    // condensed drops: slide down the inner tube, then fall into the receiver
    o.drops = [];
    const dm = new THREE.MeshPhysicalMaterial({ color: 0xe6f3fa, transparent: true, opacity: 0.7, roughness: 0, clearcoat: 1, envMapIntensity: 2 });
    for (let i = 0; i < 14; i++) {
      const d = K.mesh(new THREE.SphereGeometry(0.0021, 10, 8), dm, { cast: false, order: 3 });
      d.visible = false;
      sc.add(d);
      o.drops.push({ m: d, s: 0, live: false, fall: 0 });
    }
    o.vapour = emitter(sc, { n: 16, color: 0xeef3f8, opacity: 0.14, size: [0.008, 0.02], life: 1.4, rise: 0.05, spread: 0.008, origin: () => wp(o.flask.group, V(0, 0.095, 0)) });
    return o;
  },

  async run(lab, o) {
    const sc = lab.sc;
    lab.step(0);
    await lab.do(tr('اسكب المحلول الملحي في دورق التقطير.'), 'salt');
    const fm = wp(o.flask.group, V(0, o.flask.top + 0.004, 0));
    o.stream.color(0xdcecf3);
    await pour({ bottle: o.salt, to: fm, stream: o.stream, level: k => o.flask.liquid.set(0.004 + 0.048 * k), dur: 1.6 });
    lab.log(tr('وضعتُ محلولاً ملحياً (ماء وملح) في دورق التقطير.'));
    await lab.do(tr('ضع ميزان الحرارة في فوهة الدورق، بحيث يكون مستودعه مقابل الأنبوب الجانبي.'), 'thermo');
    await moveTo(o.th.group, o.thAt, 1.2, { lift: 0.35, rot: new THREE.Euler(0, 0, 0) });
    o.stop.group.visible = true;
    snd.glass();
    const read = label(o.th.group, V(0, o.th.L + 0.03, 0), 'reading');
    lab.cleanup(() => read.remove());
    await lab.do(tr('صِل المكثّف بالأنبوب الجانبي لدورق التقطير.'), 'condenser');
    await moveTo(o.cond.group, o.condAt.p, 1.3, { lift: 0.2, rot: o.condAt.q });
    snd.glass();
    await lab.do(tr('ضع دورق الاستقبال تحت نهاية المكثّف.'), 'receiver');
    await moveTo(o.recv.group, o.recvAt, 1.0, { lift: 0.1 });
    snd.glass();

    lab.step(1);
    o.cond.group.updateMatrixWorld(true);
    const low = wp(o.cond.group, o.cond.lowPort.position), high = wp(o.cond.group, o.cond.highPort.position);
    const pLow = new THREE.Group(), pHigh = new THREE.Group();
    pLow.position.copy(low); pHigh.position.copy(high);
    for (const g of [pLow, pHigh]) {
      const n = K.mesh(new THREE.SphereGeometry(0.009, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), { cast: false });
      g.add(n);
      sc.add(g);
    }
    sc.pickable(pLow, 'portLow', tr('فتحة المكثّف السفلى'));
    sc.pickable(pHigh, 'portHigh', tr('فتحة المكثّف العليا'));
    await lab.do(tr('صِل خرطوم الماء البارد القادم من الصنبور بإحدى فتحتي المكثّف. من أيّ فتحة يجب أن يدخل الماء البارد؟'), 'portLow', {
      wrong: { portHigh: tr('في الشكل يدخل الماء البارد من <b>أسفل</b> المكثّف ويخرج من أعلاه، فيمتلئ غلاف المكثّف كلّه بالماء البارد.') },
    });
    const tap = ROOM.tapMouth.clone();
    const lay = (x, z) => V(x, B + 0.006, z);
    sc.add(K.hoseMesh([tap, tap.clone().add(V(0.01, -0.06, 0.03)), V(tap.x + 0.12, B + 0.02, -0.06), lay(-0.7, 0.02), lay(low.x - 0.06, 0.0), V(low.x, low.y - 0.05, low.z + 0.02), low]));
    const drain = ROOM.drain.clone();
    sc.add(K.hoseMesh([high, high.clone().add(V(0.0, 0.05, -0.01)), V(high.x - 0.06, high.y + 0.04, -0.3), lay(-0.6, -0.42), lay(-1.1, -0.42), V(-1.25, B + 0.05, -0.3), V(drain.x + 0.03, drain.y + 0.08, drain.z - 0.05), drain]));
    snd.place();
    lab.log(tr('يدخل الماء البارد من أسفل المكثّف ويخرج من أعلاه.'));
    await lab.do(tr('افتح صنبور الماء البارد.'), 'tap', { wrong: { burner: tr('شغّل ماء التبريد في المكثّف أولاً، ثمّ ابدأ التسخين.') } });
    snd.water(true);
    lab.cleanup(() => snd.water(false));
    const lever = ROOM.parts.tapLever;
    const lever0 = lever.rotation.y;
    lab.cleanup(() => { lever.rotation.y = lever0; });
    await anim(0.4, k => { lever.rotation.y = lever0 + 0.9 * k; });
    const L = o.cond.L;
    await anim(2.6, k => o.cond.water.set(-L / 2 + L * k), x => x);
    lab.log(tr('امتلأ غلاف المكثّف بالماء البارد.'));

    lab.step(2);
    await lab.do(tr('أشعل موقد بنزن لتسخين المحلول الملحي.'), 'burner');
    await lightBurner(o.burner);
    const S = { T: 20, Tth: 20, vol: 200, dist: 0, on: true, t: 0 };
    const ch = lab.chart({ title: tr('قراءة ميزان الحرارة'), yMin: 0, yMax: 120, yStep: 20, xMax: 60 });
    let lastPush = -1, dropAcc = 0;
    const r3 = (0.045 - 0.0016) * 100; // inner radius in cm
    const levelFor = vol => { // spherical cap height (cm) for volume (mL)
      let lo = 0, hi = 2 * r3;
      for (let i = 0; i < 30; i++) { const h = (lo + hi) / 2; (Math.PI * h * h * (3 * r3 - h) / 3 < vol ? (lo = h) : (hi = h)); }
      return lo / 100;
    };
    const recvArea = Math.PI * 3.6 * 3.6;
    sc.onFrame((dt, sdt) => {
      let rate = 0;
      if (S.on && sdt > 0) {
        S.t += sdt;
        if (S.T < 100.4) S.T = Math.min(100.4, S.T + sdt * 1.35);
        else if (S.vol > 22) { rate = 1.45; const dv = Math.min(S.vol - 22, rate * sdt); S.vol -= dv; S.dist += dv; dropAcc += dv; }
        const target = S.T > 99 ? 100.0 : 20 + Math.max(0, S.T - 60) * 0.5;
        S.Tth += (target - S.Tth) * Math.min(1, sdt / 5);
        if (S.t - lastPush > 0.5) { lastPush = S.t; ch.push(S.t, S.Tth); }
      }
      o.flask.liquid.set(0.0016 + levelFor(S.vol));
      o.recv.liquid.set(o.recv.bottom + S.dist / recvArea / 100);
      o.th.set(S.Tth);
      read.set(`${fmtT(S.Tth)} °C`);
      ch.val(tr(`${fmtT(S.Tth)} °C · ماء مقطّر ${Math.round(S.dist)} mL`));
      o.bubbles.rate = S.on ? (S.T >= 100 ? 1.2 : Math.max(0, (S.T - 85) / 15) * 0.3) : 0;
      o.vapour.rate = S.on && S.T >= 100 ? 5 : 0;
      o.crystals.count = S.vol < 70 ? Math.round(90 * Math.min(1, (70 - S.vol) / 48)) : 0;
      if (S.on && S.T >= 100) snd.boil(true); else snd.boil(false);
      // drops
      if (dropAcc > 1.2) {
        const d = o.drops.find(d => !d.live);
        if (d) { dropAcc -= 1.2; d.live = true; d.s = 0; d.fall = 0; d.m.visible = true; } else dropAcc = 0;
      }
      for (const d of o.drops) {
        if (!d.live) continue;
        if (d.s < 1) {
          d.s += dt * 0.55;
          const a = o.condAt.p.clone().addScaledVector(o.flask.armDir, -0.12), b = o.outlet;
          d.m.position.lerpVectors(a, b, Math.min(1, d.s)).add(V(0, -0.003, 0));
        } else {
          d.fall += dt;
          d.m.position.y -= dt * (0.05 + d.fall * 3);
          if (d.m.position.y < o.recv.group.position.y + o.recv.liquid.level) { d.live = false; d.m.visible = false; }
        }
      }
    });
    lab.cleanup(() => snd.boil(false));
    lab.sim(true);
    lab.watch(tr('راقب المحلول في دورق التقطير، والمكثّف، ودورق الاستقبال.'));
    await lab.until(() => S.dist >= 6);
    await lab.ask({
      q: tr('يتبخّر الماء من المحلول الملحي. ماذا يحدث للبخار عندما يمرّ في المكثّف؟'),
      opts: [tr('يبرد فيتحوّل إلى حالةٍ سائلة'), tr('يسخن فيتحوّل إلى بلازما'), tr('يبقى بخاراً ويخرج إلى الهواء'), tr('يتحوّل إلى ملح صلب')],
      right: 0, why: tr('أُبرّد البخار، فيتحوّل إلى حالةٍ سائلة.'),
    });
    lab.log(tr('يتبخّر الماء من المحلول، ويبرد البخار في المكثّف فيتحوّل إلى سائل يتجمّع في دورق الاستقبال (ماء مقطّر).'));
    await lab.until(() => S.vol <= 45);
    await lab.ask({
      q: tr('انظر إلى قعر دورق التقطير. ماذا يتبقّى فيه بعد تبخّر الماء؟'),
      opts: [tr('الملح في حالةٍ صلبة'), tr('الماء المقطّر'), tr('لا يتبقّى شيء'), tr('بخار الماء')],
      right: 0, why: tr('أُلاحظ تبخّر الماء، وتبقّي الملح في حالةٍ صلبة.'),
    });
    lab.log(tr('تبقّى الملح في دورق التقطير في حالةٍ صلبة.'));
    await lab.until(() => S.vol <= 24);
    lab.sim(false);
    await lab.do(tr('لم يبقَ في الدورق إلا قليل من الماء. أطفئ موقد بنزن، ولا تسخّن الدورق حتى الجفاف.'), 'burner', {
      unsafe: { tap: tr('لا تُغلق ماء التبريد قبل إطفاء الموقد، وإلّا خرج البخار من المكثّف دون أن يتكاثف.') },
    });
    await offBurner(o.burner);
    S.on = false;
    ch.push(S.t, S.Tth, true);
    await lab.do(tr('أغلق صنبور ماء التبريد.'), 'tap');
    snd.water(false);
    await anim(0.4, k => { lever.rotation.y = lever0 + 0.9 * (1 - k); });

    lab.step(3);
    await lab.ask({
      q: tr('ماذا يُسمّى هذا النوع من التقطير؟'),
      opts: [tr('تقطيراً بسيطاً'), tr('تقطيراً تجزيئياً'), tr('ترشيحاً'), tr('تسامياً')],
      right: 0, why: tr('أُبرّد البخار، فيتحوّل إلى حالةٍ سائلة، فأُسمّي هذا النوع من التقطير <b>تقطيراً بسيطاً</b>.'),
    });
    lab.step(4);
    await lab.ask({
      q: tr('كيف نَفصِل مكوّناتِ خليط من المواد السائلة، اعتماداً على اختلاف درجة غليان كلٍّ منها؟'),
      opts: [tr('أسخّن الخليط، فتتبخّر المواد على مراحل تبعاً لدرجة غليان كلٍّ منها من الأدنى إلى الأعلى (تقطير تجزيئي)'), tr('أبرّد الخليط حتى يتجمّد كلّه'), tr('أترك الخليط حتى تترسّب مكوّناته'), tr('أسخّن الخليط، فتتبخّر المواد كلّها معاً في وقت واحد')],
      right: 0, why: tr('أسخّن خليطاً من المواد السائلة، فأُلاحظ تبخّر المواد على مراحل تبعاً لدرجة غليان كلٍّ منها من الأدنى إلى الأعلى. أسمّي هذا النوع من التقطير، <b>تقطيراً تجزيئياً</b>.'),
    });
    await lab.ask({
      kicker: tr('نشاط (5)'),
      q: tr('كيف يتمُّ فصل مكوّنات النفط؟'),
      opts: [tr('بالتقطير التجزيئي، لاختلاف درجات غليان مكوّناته'), tr('بالتقطير البسيط'), tr('بالترشيح'), tr('بالمغناطيس')],
      right: 0, ours: true, why: tr('النفط خليط من مواد سائلة تختلف درجات غليانها، فتُفصل بالتقطير التجزيئي.'),
    });
    await lab.ask({
      q: tr('فكِّر كيف تستثمر التحوّلات الفيزيائية للحصول على أشكال مُختلفة من المواد التي تستعملها في حياتك اليومية؟'),
      opts: [tr('صهر المواد الصلبة، ثمّ وضعها في قوالب وتبريدها'), tr('حرق المواد الصلبة'), tr('خلط المواد الصلبة بالحموض'), tr('تحليل المواد كهربائياً')],
      right: 0, why: tr('يمكنُ صهرُ المواد الصُّلبة، ثمّ وضعُها بقوالب حيث يتمُّ تبريدها، والحصول على أشكالٍ مُناسِبة، مثل إعادة تشكيل المعادن، الزجاج والبلاستيك.'),
    });
  },
};
