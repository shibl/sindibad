import { tr, lang } from './lab-locale.js';
// Lesson 2 experiments: signs of reaction (p. 19), complete reaction (pp. 19–20),
// reversible reaction (pp. 20–21), oxidation–reduction (pp. 21–22).
import { THREE, V, BENCH as B, anim, wait, moveTo } from './engine.js';
import * as K from './kit.js';
import { matchTo, lightBurner, offBurner, wp, pour, scoop, heapOn, flash } from './acts.js';
import { emitter, bubbles, grains, stream } from './fx.js';
import { snd } from './sound.js';
import { matte, plastic, canvasTex, FONT, drawFormula } from './materials.js';
import { ROOM } from './room.js';

const lerpC = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, k)));

// Wide jar of powder with a grainy surface.
function powderJar(name, formula, base, speck, hazard = null, color = '#374151') {
  const tex = K.powderTex(base, speck);
  return K.bottle({ name, formula, hazard, color, kind: 'wide', content: { color: 0xffffff, solid: true, map: tex }, contentLevel: 0.55 });
}

// Test tube contents: a solid fill (powder) plus the liquid.
function tubeFill(tube, color, map) {
  const L = K.liquid(tube.liqProf, { color, solid: true, rough: 0.95 });
  if (map) L.mats.forEach(m => { m.map = map; });
  L.set(0);
  tube.group.add(L.group);
  return L;
}

// ───────────────────────── 4. copper + concentrated nitric acid ─────────────────────────
export const copper = {
  id: 'copper', section: '1-2', title: tr('دلالات حدوث التفاعل الكيميائي'), subtitle: tr('النحاس وحمض الآزوت المركّز'), page: '19', tag: tr('تفاعل كيميائي'),
  tools: [tr('أنبوب اختبار'), tr('خراطة نحاس'), tr('حمض الآزوت المركّز'), tr('خزانة الغازات')],
  steps: [
    { t: tr('أختار مكان إجراء التفاعل: يُعَدّ غاز [[NO2]] ضارّاً بالصحّة.'), book: false },
    { t: tr('أُشغّل مروحة خزانة الغازات، وأخفض الواجهة الزجاجية.'), book: false },
    { t: tr('أضع قطعاً من النحاس في أنبوب الاختبار، وأضيف إليها حمض الآزوت المركّز.'), book: false },
    tr('عند تفاعل النحاس مع حمض الآزوت المركّز يتلوّن المحلول بلون أزرق، وينطلق غاز لونه نارنجي.'),
    tr('أستنتج: من دلالات حدوث التفاعل الكيميائي اختفاء مواد، تشكّل مواد، ظهور ألوان، انطلاق غازات، انتشار روائح و غيرها.'),
  ],
  result: [
    tr('من دلالات حدوث التفاعل الكيميائي اختفاء مواد، تشكّل مواد، ظهور ألوان، انطلاق غازات، انتشار روائح و غيرها.'),
    tr('قبل القيام بتفاعلات كيميائية يجب الحذر، ومعرفة تأثيرها على صحّة الإنسان. مثلاً: يُعَدّ غاز [[NO2]] ضار بالصحّة.'),
  ],
  view: { pos: [0.05, 1.3, 0.6], target: [0.0, 1.0, -0.06] },
  hoodView: { pos: [-2.42, 1.33, 0.5], target: [-2.42, 1.06, -0.3] },

  build(sc) {
    const o = {};
    o.tray = new THREE.Group();
    const tray = K.mesh(new K.RoundedBoxGeometry(0.42, 0.012, 0.24, 2, 0.004), plastic(0xdfe4ea, 0.5), { receive: true });
    tray.position.y = 0.006;
    o.tray.add(tray);
    o.rack = K.rack({ n: 3 });
    o.rack.group.position.set(-0.05, 0.012, -0.02);
    o.tray.add(o.rack.group);
    o.tube = K.testTube();
    o.tube.group.position.copy(o.rack.slot(1));
    o.rack.group.add(o.tube.group);
    o.jar = powderJar(tr('خراطة نحاس'), 'Cu', '#9a5a2c', ['#d08a4e', '#7a4220', '#e3a06a', '#5c3016'], null, '#9a3412');
    o.jar.group.position.set(0.1, 0.012, -0.05);
    o.tray.add(o.jar.group);
    o.acid = K.bottle({ name: tr('حمض الآزوت المركّز'), formula: 'HNO3', hazard: 'corrosive', color: '#991b1b', amber: true });
    o.acid.group.position.set(0.17, 0.012, 0.05);
    o.acid.group.rotation.y = -0.3;
    o.tray.add(o.acid.group);
    o.spat = K.spatula();
    o.spat.group.position.set(0.0, 0.014, 0.085);
    o.spat.group.rotation.y = Math.PI / 2 + 0.3;
    o.tray.add(o.spat.group);
    o.tray.position.set(0, B, -0.02);
    sc.add(o.tray);
    sc.pickable(o.tube.group, 'tube', tr('أنبوب اختبار'));
    sc.pickable(o.jar.group, 'cu', tr('خراطة النحاس'));
    sc.pickable(o.acid.group, 'hno3', tr('حمض الآزوت المركّز'));
    sc.pickable(ROOM.parts.hood, 'hood', tr('خزانة الغازات'), { halo: false });

    o.cuFill = tubeFill(o.tube, 0xffffff, K.powderTex('#a8622f', ['#d9955a', '#7a4220', '#efb07a']));
    o.heap = heapOn(o.spat, 0xb06a35);
    o.grains = grains(sc, { color: 0xb06a35, size: 0.0014 });
    o.stream = stream(sc, 0xf3efd5, 0.6, 0.0012);
    o.bub = bubbles(o.tube.group, { n: 30, size: 0.0009, speed: 0.04, area: () => ({ x: 0, z: 0, r: 0.004, y0: o.cuFill.level, y1: o.tube.liquid.level }) });
    // brown gas filling the tube above the liquid
    o.gasMat = new THREE.MeshBasicMaterial({ color: 0xb4501c, transparent: true, opacity: 0, depthWrite: false });
    o.gas = K.mesh(new THREE.CylinderGeometry(o.tube.inR - 0.0006, o.tube.inR - 0.0006, 1, 20, 1, true), o.gasMat, { cast: false, order: 2 });
    o.gas.visible = false;
    o.tube.group.add(o.gas);
    o.fumes = emitter(sc, {
      n: 50, color: 0xb9561f, opacity: 0.42, size: [0.014, 0.11], life: 3.4, rise: 0.05, spread: 0.006,
      origin: () => wp(o.tube.group, V(0, o.tube.mouth + 0.004, 0)),
      drift: () => (ROOM.parts.fan.on ? V(0, 0.05, -0.09) : V(0.01, 0, 0.02)),
    });
    return o;
  },

  async run(lab, o) {
    const fan = ROOM.parts.fan, sash = ROOM.parts.sash;
    const sashY = sash.position.y;
    lab.cleanup(() => {
      fan.on = false; fan.led.material.color.setHex(0x3a3f45); fan.sw.rotation.x = 0; fan.disp.set('0.0 m/s'); sash.position.y = sashY; snd.fan(false);
    });
    lab.step(0);
    await lab.do(tr('يُطلق تفاعل النحاس مع حمض الآزوت المركّز غاز [[NO2]] الضارّ بالصحّة. أين يجب أن تُجري هذا التفاعل؟'), 'hood', {
      unsafe: {
        tube: tr('لا تُجرِ هذا التفاعل على طاولة المختبر المفتوحة: يُعَدّ غاز [[NO2]] ضارّاً بالصحّة.'),
        hno3: tr('لا تُجرِ هذا التفاعل على طاولة المختبر المفتوحة: يُعَدّ غاز [[NO2]] ضارّاً بالصحّة.'),
        cu: tr('لا تُجرِ هذا التفاعل على طاولة المختبر المفتوحة: يُعَدّ غاز [[NO2]] ضارّاً بالصحّة.'),
      },
    });
    const to = V(ROOM.hood.x, B, -0.3);
    await Promise.all([moveTo(o.tray, to, 1.6, { lift: 0.25 }), lab.fly(copper.hoodView, 1.7)]);
    lab.setView(copper.hoodView);
    snd.place();
    lab.log(tr('نقلتُ الأدوات إلى خزانة الغازات لأنّ غاز [[NO2]] ضارّ بالصحّة.'));

    lab.step(1);
    sash.userData.pick = undefined;
    lab.sc.pickable(fan.panel, 'fan', tr('مفتاح مروحة الخزانة'));
    lab.sc.pickable(sash, 'sash', tr('الواجهة الزجاجية للخزانة'), { halo: false });
    await lab.do(tr('شغّل مروحة سحب الغازات في الخزانة.'), 'fan');
    snd.switch();
    fan.on = true;
    fan.sw.rotation.x = 0.35;
    fan.led.material.color.setHex(0x22e07a);
    fan.disp.set('0.5 m/s');
    snd.fan(true);
    await lab.do(tr('اخفض الواجهة الزجاجية للخزانة إلى مستوى العمل.'), 'sash');
    await moveTo(sash, V(sash.position.x, sashY - 0.2, sash.position.z), 0.9);

    lab.step(2);
    await lab.do(tr('ضع بعض قطع النحاس في أنبوب الاختبار.'), 'cu');
    const mouth = () => wp(o.tube.group, V(0, o.tube.mouth, 0));
    await scoop({ spatula: o.spat, heap: o.heap, grains: o.grains, from: wp(o.jar.group, V(0, 0.05, 0)), to: mouth(), floorY: wp(o.tube.group, V(0, 0.006, 0)).y, onDrop: () => anim(0.4, k => o.cuFill.set(0.0012 + 0.008 * k)) });
    await wait(0.3);
    await lab.do(tr('أضف قليلاً من حمض الآزوت المركّز إلى النحاس.'), 'hno3');
    o.tube.liquid.color(0xf3efd5).opacity(0.60);
    await pour({ bottle: o.acid, to: mouth(), stream: o.stream, level: k => o.tube.liquid.set(0.0012 + 0.036 * k), tilt: 1.9, dur: 1.0 });
    // the reaction runs in real time
    const R = { k: 0 };
    lab.sc.onFrame(dt => {
      R.k = Math.min(1, R.k + dt / 14);
      const k = R.k;
      o.tube.liquid.color(k < 0.5 ? lerpC(0xf3efd5, 0x2f9c8f, k * 2) : lerpC(0x2f9c8f, 0x2a6fc0, (k - 0.5) * 2)).opacity(0.55 + 0.25 * k);
      o.cuFill.set(0.0012 + 0.008 * (1 - k * 0.85));
      o.bub.rate = k < 1 ? 1.4 : 0.6;
      const lv = o.tube.liquid.level;
      o.gas.visible = true;
      o.gas.scale.y = o.tube.mouth - lv;
      o.gas.position.y = (o.tube.mouth + lv) / 2;
      o.gasMat.opacity = Math.min(0.55, k * 2.2) * 0.55;
      o.fumes.rate = k > 0.06 ? 9 * (1 - k * 0.5) : 0;
    });
    lab.watch(tr('راقب لون المحلول، والغاز المنطلق من الأنبوب.'));
    await lab.wait(6);

    lab.step(3);
    await lab.ask({
      q: tr('ماذا تلاحظ عند تفاعل النحاس مع حمض الآزوت المركّز؟'),
      opts: [tr('يتلوّن المحلول بلون أزرق'), tr('ينطلق غاز لونه نارنجي'), tr('يتشكّل راسب أبيض'), tr('لا يحدث أيّ تغيّر'), tr('يتلوّن المحلول بلون أحمر')],
      right: [0, 1], why: tr('عند تفاعل النحاس مع حمض الآزوت المركّز يتلوّن المحلول بلون أزرق، وينطلق غاز لونه نارنجي.'),
    });
    lab.log(tr('يتلوّن المحلول بلون أزرق، وينطلق غاز لونه نارنجي ([[NO2]]).'));
    await lab.ask({
      q: tr('احتراق الخشب بأكسجين الهواء: ما الذي يدلّ على حدوث تفاعل كيميائي؟'),
      opts: [tr('تغيّر تركيب الخشب عند احتراقه وانتشار الحرارة'), tr('تغيّر شكل الخشب فقط'), tr('تغيّر حجم الخشب فقط'), tr('لا يدلّ شيء على حدوث تفاعل')],
      right: 0, why: tr('تغيّر تركيب الخشب عند احتراقه وانتشار الحرارة.'),
    });
    lab.step(4);
    await lab.ask({
      q: tr('من دلالات حدوث التفاعل الكيميائي:'),
      opts: [tr('اختفاء مواد'), tr('تشكّل مواد'), tr('ظهور ألوان'), tr('انطلاق غازات'), tr('انتشار روائح'), tr('تغيّر شكل المادة فقط دون تكوّن مواد جديدة')],
      right: [0, 1, 2, 3, 4], why: tr('<b>أستنتج:</b> من دلالات حدوث التفاعل الكيميائي اختفاء مواد، تشكّل مواد، ظهور ألوان، انطلاق غازات، انتشار روائح و غيرها.'),
    });
    await lab.ask({
      kicker: tr('إضاءة'),
      q: tr('لماذا أجرينا هذا التفاعل في خزانة الغازات؟'),
      opts: [tr('لأنّ غاز [[NO2]] ضارّ بالصحّة'), tr('لأنّ التفاعل يحتاج إلى التسخين'), tr('لأنّ الضوء يوقف التفاعل'), tr('لأنّ النحاس يشتعل في الهواء')],
      right: 0, why: tr('قبل القيام بتفاعلات كيميائية يجب الحذر، ومعرفة تأثيرها على صحّة الإنسان. مثلاً: يُعَدّ غاز [[NO2]] ضار بالصحّة.'),
    });
  },
};

// ───────────────────────── 5. iron + hydrochloric acid ─────────────────────────
export const iron = {
  id: 'iron', section: '2-2', title: tr('التفاعلات التامة'), subtitle: tr('برادة الحديد وحمض كلور الماء'), page: '19–20', tag: tr('تفاعل تام'),
  tools: [tr('أنبوب اختبار'), tr('برادة حديد'), tr('حمض كلور الماء')],
  steps: [
    tr('أضعُ في أنبوب اختبار كمّية قليلة من برادة حديد.'),
    tr('أضيفُ كمّية مُناسِبة من حمض كلور الماء إلى برادة الحديد.'),
    tr('ما دلالات حدوث التفاعل؟'),
    tr('كيف يتمّ الكشف عن الغاز المُنطلِق؟'),
    tr('يتفاعل حمض كلور الماء مع الحديد، ويتكوّن كلوريد الحديد، وينطلق غاز الهدروجين.'),
  ],
  result: [
    '[[Fe(s) + 2HCl(aq) -> FeCl2(aq) + H2(g)]]',
    tr('<b>التفاعلات التامة:</b> هي تفاعلات تحدث في اتجاه واحد، تتحوّل فيها المواد المتفاعلة إلى مواد ناتجة، ولا تستطيع المواد الناتجة أن تتفاعل مع بعضها في الشروط ذاتها، لتكوّن المواد المتفاعلة مرة أخرى.'),
  ],
  view: { pos: [0.05, 1.19, 0.46], target: [0.04, 1.0, -0.08] },

  build(sc) {
    const o = {};
    o.rack = K.rack({ n: 4 });
    o.rack.group.position.set(-0.02, B, -0.09);
    sc.add(o.rack.group);
    o.tube = K.testTube();
    o.tube.group.position.copy(o.rack.slot(1));
    o.rack.group.add(o.tube.group);
    sc.pickable(o.tube.group, 'tube', tr('أنبوب اختبار'));
    sc.pickable(o.rack.group, 'rack', tr('حامل أنابيب الاختبار'));
    o.jar = powderJar(tr('برادة حديد'), 'Fe', '#55585d', ['#7d8186', '#2a2b2e', '#a3a7ac', '#3b3c40']);
    o.jar.group.position.set(0.15, B, -0.1);
    o.jar.group.rotation.y = -0.2;
    sc.add(o.jar.group);
    sc.pickable(o.jar.group, 'iron', tr('برادة الحديد'));
    o.acid = K.bottle({ name: tr('حمض كلور الماء'), formula: 'HCl(aq)', hazard: 'corrosive', color: '#0f766e', content: { color: 0xe8f2f5, opacity: 0.50 }, contentLevel: 0.65 });
    o.acid.group.position.set(0.27, B, -0.03);
    o.acid.group.rotation.y = -0.35;
    sc.add(o.acid.group);
    sc.pickable(o.acid.group, 'hcl', tr('حمض كلور الماء'));
    o.spat = K.spatula();
    o.spat.group.position.set(0.1, B + 0.002, 0.08);
    o.spat.group.rotation.y = Math.PI / 2 + 0.4;
    sc.add(o.spat.group);
    sc.pickable(o.spat.group, 'spatula', tr('ملعقة (سباتولا)'));
    o.mb = K.matchbox();
    o.mb.group.position.set(-0.19, B, 0.04);
    o.mb.group.rotation.y = 0.5;
    sc.add(o.mb.group);
    sc.pickable(o.mb.group, 'matches', tr('علبة الثقاب'));

    o.fe = tubeFill(o.tube, 0xffffff, K.powderTex('#5b5e63', ['#8a8e93', '#2b2c2f', '#b0b4b9']));
    o.heap = heapOn(o.spat, 0x45484c);
    o.grains = grains(sc, { color: 0x404347, size: 0.0011 });
    o.stream = stream(sc, 0xe8f2f5, 0.5, 0.0012);
    o.bub = bubbles(o.tube.group, { n: 40, size: 0.0009, speed: 0.05, area: () => ({ x: 0, z: 0, r: 0.0045, y0: o.fe.level, y1: o.tube.liquid.level }) });
    o.puff = emitter(sc, { n: 12, color: 0xbfc4c9, opacity: 0.25, size: [0.01, 0.05], life: 1.4, rise: 0.06, spread: 0.004, origin: () => wp(o.tube.group, V(0, o.tube.mouth + 0.005, 0)) });
    return o;
  },

  async run(lab, o) {
    lab.step(0);
    await lab.do(tr('ضع في أنبوب الاختبار كمّية قليلة من برادة الحديد.'), ['iron', 'spatula']);
    const mouth = () => wp(o.tube.group, V(0, o.tube.mouth, 0));
    await scoop({ spatula: o.spat, heap: o.heap, grains: o.grains, from: wp(o.jar.group, V(0, 0.05, 0)), to: mouth(), floorY: wp(o.tube.group, V(0, 0.005, 0)).y, onDrop: () => anim(0.4, k => o.fe.set(0.0012 + 0.012 * k)) });
    lab.log(tr('وضعتُ كمّية قليلة من برادة الحديد (لونها أسود رمادي) في أنبوب الاختبار.'));

    lab.step(1);
    await lab.do(tr('أضف كمّية مُناسِبة من حمض كلور الماء إلى برادة الحديد.'), 'hcl');
    o.tube.liquid.color(0xe8f2f5).opacity(0.54);
    await pour({ bottle: o.acid, to: mouth(), stream: o.stream, level: k => o.tube.liquid.set(0.0012 + 0.045 * k), tilt: 1.9, dur: 1.1 });
    const R = { k: 0 };
    lab.sc.onFrame(dt => {
      R.k = Math.min(1, R.k + dt / 16);
      o.tube.liquid.color(lerpC(0xd6e9ef, 0x7fc06a, R.k)).opacity(0.54 + 0.2 * R.k);
      o.fe.set(0.0012 + 0.012 * (1 - R.k * 0.92));
      o.bub.rate = R.k < 1 ? 1.6 : 0.5;
    });
    lab.watch(tr('راقب ما يحدث في أنبوب الاختبار.'));
    await lab.wait(7);

    lab.step(2);
    await lab.ask({
      q: tr('ما دلالات حدوث التفاعل؟'),
      opts: [tr('اختفاء برادة الحديد'), tr('تشكّل مركّب لونه أخضر'), tr('انطلاق فقاعات غازية'), tr('تشكّل راسب أبيض'), tr('انطلاق غاز لونه نارنجي')],
      right: [0, 1, 2], why: tr('ألاحظ اختفاء برادة الحديد، وتشكّل مُركَّب لونه أخضر، وانطلاق فقاعات غازية.'),
    });
    lab.log(tr('اختفت برادة الحديد، وتشكّل مركّب لونه أخضر، وانطلقت فقاعات غازية.'));

    lab.step(3);
    await lab.do(tr('كيف يتمّ الكشف عن الغاز المُنطلِق؟ قرّب عود ثقاب مشتعلاً من فوهة الأنبوب.'), 'matches');
    const back = await matchTo(o.mb, mouth().add(V(0, 0.012, 0.004)), { hold: 0.15 });
    snd.pop();
    flash(lab.sc, mouth().add(V(0, 0.01, 0)), 0xffc46b);
    o.puff.rate = 14;
    setTimeout(() => { o.puff.rate = 0; }, 400);
    await wait(0.6);
    await back();
    await lab.ask({
      q: tr('عند تقريب عود الثقاب المشتعل من فوهة الأنبوب حدثت فرقعة. على ماذا يدلّ ذلك؟'),
      opts: [tr('انطلاق غاز الهدروجين'), tr('انطلاق غاز ثنائي أكسيد الكربون'), tr('انطلاق غاز الأكسجين'), tr('انطلاق غاز الكلور')],
      right: 0, why: tr('أُقرّب عود ثقاب مُشتعِل من فوهة الأنبوب، فيُحدث فرقعة، ممّا يدلّ على انطلاق غاز الهدروجين.'),
    });
    lab.log(tr('يُحدث عود الثقاب المشتعل فرقعة عند فوهة الأنبوب: الغاز المنطلق هو الهدروجين.'));

    lab.step(4);
    await lab.ask({
      kicker: tr('المعادلة'),
      q: tr('أكمل المعادلة: [[Fe(s) + 2HCl(aq) ->]] … + …'),
      opts: ['[[FeCl2(aq)]]', '[[H2(g)]]', '[[FeCl3(aq)]]', '[[Cl2(g)]]', '[[H2O(l)]]'],
      right: [0, 1], why: '[[Fe(s) + 2HCl(aq) -> FeCl2(aq) + H2(g)]]',
    });
    lab.log('[[Fe(s) + 2HCl(aq) -> FeCl2(aq) + H2(g)]]');
    await lab.ask({
      q: tr('ماذا تُسمّى التفاعلات التي تحدث في اتجاه واحد، تتحوّل فيها المواد المتفاعلة إلى مواد ناتجة، ولا تستطيع المواد الناتجة أن تتفاعل مع بعضها في الشروط ذاتها لتكوّن المواد المتفاعلة مرة أخرى؟'),
      opts: [tr('التفاعلات التامة'), tr('التفاعلات العكوسة'), tr('التغيّرات الفيزيائية'), tr('تفاعلات التعادل')],
      right: 0, why: tr('هذه هي <b>التفاعلات التامة</b>.'),
    });
    await lab.ask({
      kicker: tr('نشاط (2)'),
      q: tr('اذكر مثالاً عن تفاعل كيميائي يعتبر تامّاً من بيئتك.'),
      opts: [tr('احتراق الخشب'), tr('انصهار الجليد'), tr('تبخّر الماء'), tr('تفاعل اليود مع الهدروجين في وعاء مغلق')],
      right: 0, ours: true, why: tr('احتراق الخشب يحدث في اتجاه واحد، ولا تتفاعل نواتجه لتعيد الخشب. أمّا انصهار الجليد وتبخّر الماء فتغيّرات فيزيائية، وتفاعل اليود مع الهدروجين تفاعل عكوس.'),
    });
  },
};

// ───────────────────────── 6. iodine + hydrogen (reversible) ─────────────────────────
export const iodine = {
  id: 'iodine', section: '3-2', title: tr('التفاعلات العكوسة'), subtitle: tr('بخار اليود وغاز الهدروجين'), page: '20–21', tag: tr('تفاعل عكوس'),
  tools: [tr('وعاء زجاجي مغلق'), tr('بخار اليود'), tr('غاز الهدروجين'), tr('مسخّن كهربائي (حتى 445 °C)')],
  steps: [
    tr('عند مزج حجم من بخار اليود ذي اللون البنفسجي، مع حجم مساوٍ له من غاز الهدروجين عديم اللون في وعاء مغلق،'),
    tr('والتسخين إلى الدرجة 445°C، نلاحظ أن اللون البنفسجي ينقص تدريجياً ثمّ يثبت.'),
    tr('سمّ الجزيئات الغازية في كلٍّ من الشكلين.'),
    tr('ما دلالة التناقص التدريجي للون البنفسجي، ثمّ ثباته؟'),
  ],
  result: [
    '[[I2(g) + H2(g) <=> 2HI(g)]]',
    tr('<b>التفاعلات العكوسة</b> هي تفاعلات تتمّ باتجاهين حيث إنَّ المواد المتفاعلة لا تستهلك كلّياً، لأنّ المواد الناتجة تتفاعل فيما بينها لتعطي المواد المتفاعلة في الشروط ذاتها.'),
  ],
  view: { pos: [0.02, 1.22, 0.5], target: [0.0, 1.06, -0.12] },
  closeView: { pos: [0.0, 1.1, 0.14], target: [0.0, 1.07, -0.12] },

  build(sc) {
    const o = {};
    const cx = 0, cy = B + 0.17, cz = -0.12, R = 0.05;
    o.center = V(cx, cy, cz);
    o.R = R;
    // retort stand with a support ring under the bulb
    o.stand = K.stand({ h: 0.42 });
    o.stand.group.position.set(cx, B, cz - 0.11 + 0.07);
    sc.add(o.stand.group);
    const ring = K.mesh(new THREE.TorusGeometry(0.034, 0.003, 8, 32), K.M.dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, cy - R + 0.012, cz);
    sc.add(ring);
    const rarm = K.mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.076, 10), K.M.dark);
    rarm.rotation.x = Math.PI / 2;
    rarm.position.set(cx, cy - R + 0.012, cz - 0.072);
    sc.add(rarm);
    const boss = K.mesh(new K.RoundedBoxGeometry(0.022, 0.022, 0.022, 2, 0.003), K.M.steel);
    boss.position.set(cx, cy - R + 0.012, cz - 0.11);
    sc.add(boss);
    // sealed glass bulb
    o.bulb = new THREE.Group();
    o.bulb.position.copy(o.center);
    o.bulb.add(K.glassMesh(new THREE.SphereGeometry(R, 48, 32)));
    const neck = K.glassMesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 16, 1, true));
    neck.position.y = R + 0.02;
    o.bulb.add(neck);
    const seal = K.glassMesh(new THREE.SphereGeometry(0.0075, 16, 10));
    seal.position.y = R + 0.045;
    o.bulb.add(seal);
    o.gasMat = new THREE.MeshBasicMaterial({ color: 0x7a2c8f, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide });
    o.gas = K.mesh(new THREE.SphereGeometry(R - 0.0015, 40, 24), o.gasMat, { cast: false, order: 2 });
    o.bulb.add(o.gas);
    o.gasFront = K.mesh(new THREE.SphereGeometry(R - 0.0016, 40, 24), o.gasMat.clone(), { cast: false, order: 2 });
    o.gasFront.material.side = THREE.FrontSide;
    o.bulb.add(o.gasFront);
    sc.add(o.bulb);
    sc.pickable(o.bulb, 'bulb', tr('وعاء زجاجي مغلق'));
    // inlet tubes with stopcocks
    const inlet = (sx) => {
      const g = new THREE.Group();
      const pts = [V(sx * (R - 0.003), 0.012, 0), V(sx * (R + 0.04), 0.03, 0), V(sx * (R + 0.09), 0.03, 0)];
      g.add(K.glassTube(pts, 0.0032).mesh);
      const cock = new THREE.Group();
      const barrel = K.glassMesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.018, 16));
      cock.add(barrel);
      const key = K.mesh(new K.RoundedBoxGeometry(0.004, 0.026, 0.008, 1, 0.0015), K.M.white);
      key.position.y = 0.014;
      cock.add(key);
      cock.position.set(sx * (R + 0.055), 0.03, 0);
      g.add(cock);
      g.position.copy(o.center);
      sc.add(g);
      return { g, key, end: o.center.clone().add(V(sx * (R + 0.09), 0.03, 0)) };
    };
    o.inL = inlet(-1);
    o.inR = inlet(1);
    // iodine flask on the left
    o.flask = K.rbFlask({ R: 0.032, rn: 0.009, neck: 0.04 });
    o.flask.group.position.set(-0.24, B + 0.03, cz);
    sc.add(o.flask.group);
    const cork = K.mesh(new THREE.TorusGeometry(0.02, 0.008, 10, 24), K.M.cork);
    cork.rotation.x = Math.PI / 2;
    cork.position.set(-0.24, B + 0.008, cz);
    sc.add(cork);
    const crystals = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2a1f33, metalness: 0.6, roughness: 0.3 }), 40);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) {
      const r = Math.sqrt(Math.random()) * 0.016, a = Math.random() * 6.28;
      m4.compose(V(Math.cos(a) * r, 0.003 + Math.random() * 0.002, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0)), V(1, 0.5, 0.7).multiplyScalar(0.003 + Math.random() * 0.003));
      crystals.setMatrixAt(i, m4);
    }
    o.flask.group.add(crystals);
    const fv = K.mesh(new THREE.SphereGeometry(0.03, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7a2c8f, transparent: true, opacity: 0.4, depthWrite: false }), { cast: false, order: 2 });
    fv.position.y = 0.032;
    o.flask.group.add(fv);
    const fneck = wp(o.flask.group, V(0, o.flask.top, 0));
    sc.add(K.glassTube([fneck, fneck.clone().add(V(0, 0.03, 0)), V(fneck.x + 0.03, o.inL.end.y + 0.004, cz), o.inL.end], 0.003).mesh);
    sc.pickable(o.inL.g, 'i2valve', tr('صنبور بخار اليود'));
    sc.pickable(o.flask.group, 'i2', tr('بخار اليود (بنفسجي)'));
    // hydrogen cylinder on the right
    const cyl = new THREE.Group();
    const body = K.mesh(new THREE.CapsuleGeometry(0.034, 0.24, 8, 24), plastic(0xb91c1c, 0.35));
    body.position.y = 0.154;
    cyl.add(body);
    const lab = K.plate(0.05, 0.09, (g, w, h) => {
      g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#111'; g.textAlign = 'center';
      drawFormula(g, 'H2', w / 2, h * 0.42, 110);
      g.font = `700 44px ${FONT}`; g.direction = lang === 'ar' ? 'rtl' : 'ltr'; g.fillText(tr('هدروجين'), w / 2, h * 0.78);
    }, 256);
    lab.position.set(0, 0.17, 0.0345);
    cyl.add(lab);
    const valve = K.mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.03, 16), K.M.chrome);
    valve.position.y = 0.32;
    cyl.add(valve);
    const wheel = K.mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 20), K.M.black);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.y = 0.338;
    cyl.add(wheel);
    o.wheel = wheel;
    cyl.position.set(0.31, B, cz - 0.06);
    sc.add(cyl);
    sc.pickable(cyl, 'h2', tr('أسطوانة غاز الهدروجين'));
    cyl.updateMatrixWorld(true);
    const vOut = wp(cyl, V(0.012, 0.31, 0));
    sc.add(K.hoseMesh([vOut, vOut.clone().add(V(0.03, -0.01, 0.02)), V(o.inR.end.x + 0.05, o.inR.end.y - 0.05, cz + 0.02), o.inR.end.clone().add(V(0.01, 0, 0)), o.inR.end], 0.0035, 0xd6d3c8));
    sc.pickable(o.inR.g, 'h2valve', tr('صنبور غاز الهدروجين'));
    // heating coil round the bulb + controller
    const pts = [];
    for (let i = 0; i <= 360; i++) { const t = i / 360, a = t * Math.PI * 2 * 5; const y = -0.035 + t * 0.05; const r = Math.sqrt(Math.max(0.0001, (R + 0.007) ** 2 - y * y)); pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
    o.coilMat = new THREE.MeshStandardMaterial({ color: 0x6b5c55, emissive: 0x000000, roughness: 0.5, metalness: 0.6 });
    const coil = K.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.0016, 6), o.coilMat);
    coil.position.copy(o.center);
    sc.add(coil);
    const ctl = new THREE.Group();
    const cb = K.mesh(new K.RoundedBoxGeometry(0.14, 0.075, 0.11, 2, 0.005), plastic(0xe9ecef, 0.45));
    cb.position.y = 0.0375;
    ctl.add(cb);
    o.disp = K.display(0.08, 0.026);
    o.disp.mesh.position.set(0, 0.05, 0.0555);
    o.disp.set('20 °C');
    ctl.add(o.disp.mesh);
    const ctlLab = K.plate(0.1, 0.018, (g, w, h) => { g.fillStyle = '#e9ecef'; g.fillRect(0, 0, w, h); g.fillStyle = '#16324f'; g.font = `700 ${h * 0.7}px ${FONT}`; g.textAlign = 'center'; g.direction = lang === 'ar' ? 'rtl' : 'ltr'; g.fillText(tr('مسخّن كهربائي'), w / 2, h * 0.78); });
    ctlLab.position.set(0, 0.022, 0.0556);
    ctl.add(ctlLab);
    o.ctlLed = K.mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a3f45 }), { cast: false });
    o.ctlLed.position.set(0.055, 0.02, 0.056);
    ctl.add(o.ctlLed);
    ctl.position.set(0.2, B, 0.04);
    ctl.rotation.y = -0.4;
    sc.add(ctl);
    sc.pickable(ctl, 'heater', tr('المسخّن الكهربائي'));
    ctl.updateMatrixWorld(true);
    const cOut = wp(ctl, V(-0.07, 0.03, 0));
    sc.add(K.cable([cOut, V(cOut.x - 0.06, B + 0.004, cOut.z), V(0.06, B + 0.004, cz + 0.06), o.center.clone().add(V(0.03, -0.04, 0.045))], 0x1d1f22));

    // molecules (hidden until the particle view is on)
    o.mol = new THREE.Group();
    o.mol.visible = false;
    o.mol.position.copy(o.center);
    sc.add(o.mol);
    const ballG = new THREE.SphereGeometry(0.0048, 16, 12);
    o.matI = new THREE.MeshStandardMaterial({ color: 0x2f5bd3, roughness: 0.35 });
    o.matH = new THREE.MeshStandardMaterial({ color: 0xe26fa8, roughness: 0.35 });
    o.molecules = [];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const a = new THREE.Mesh(ballG, i < 6 ? o.matI : o.matH), b = new THREE.Mesh(ballG, i < 6 ? o.matI : o.matH);
      a.position.x = -0.0042;
      b.position.x = 0.0042;
      g.add(a, b);
      const p = V().randomDirection().multiplyScalar(Math.random() * (R - 0.012));
      g.position.copy(p);
      g.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      o.mol.add(g);
      o.molecules.push({ g, a, b, kind: i < 6 ? 'I2' : 'H2', v: V().randomDirection().multiplyScalar(0.012), w: V().randomDirection().multiplyScalar(2) });
    }
    return o;
  },

  async run(lab, o) {
    const sc = lab.sc;
    const S = { T: 20, heat: false, iod: 0, h2: 0, x: 0, t: 0, eq: 2 / 6 };
    let molOn = false;
    // molecule motion and conversions
    const setKind = (m, kind) => {
      m.kind = kind;
      m.a.material = kind === 'H2' ? o.matH : o.matI;
      m.b.material = kind === 'I2' ? o.matI : o.matH;
    };
    sc.onFrame((dt, sdt) => {
      for (const m of o.molecules) {
        const speed = 1 + (S.T - 20) / 300;
        m.g.position.addScaledVector(m.v, dt * speed);
        const r = m.g.position.length();
        if (r > o.R - 0.011) { const n = m.g.position.clone().normalize(); m.v.reflect(n); m.g.position.setLength(o.R - 0.011); }
        m.g.rotation.x += m.w.x * dt; m.g.rotation.y += m.w.y * dt;
      }
      if (S.heat && sdt > 0) {
        S.t += sdt;
        S.T = Math.min(445, S.T + sdt * 18);
        if (S.T > 300) S.x += (S.eq - S.x) * Math.min(1, sdt / 9);
      }
      // the molecules follow the amount reacted: x·6 molecules of I2 turned into HI (target 2 → 4 HI)
      const want = Math.round(S.x * 6 + 1e-6);
      const nHI = o.molecules.filter(m => m.kind === 'HI').length / 2;
      if (want > nHI) {
        const i2 = o.molecules.find(m => m.kind === 'I2'), h2 = o.molecules.find(m => m.kind === 'H2');
        if (i2 && h2) { setKind(i2, 'HI'); setKind(h2, 'HI'); }
      }
      // dynamic equilibrium: now and then a pair of HI splits while another pair forms
      if (S.x > S.eq * 0.97 && Math.random() < dt * 0.6) {
        const his = o.molecules.filter(m => m.kind === 'HI');
        const i2 = o.molecules.find(m => m.kind === 'I2'), h2 = o.molecules.find(m => m.kind === 'H2');
        if (his.length >= 2 && i2 && h2) { setKind(his[0], 'I2'); setKind(his[1], 'H2'); setKind(i2, 'HI'); setKind(h2, 'HI'); }
      }
      const violet = S.iod * (1 - S.x);
      o.gasMat.opacity = 0.42 * violet;
      o.gasFront.material.opacity = (molOn ? 0.12 : 0.28) * violet;
      o.disp.set(`${Math.round(S.T)} °C`);
      const glow = Math.max(0, (S.T - 120) / 325);
      o.coilMat.emissive.setRGB(1.0 * glow, 0.28 * glow, 0.05 * glow);
      o.coilMat.emissiveIntensity = 1.6;
    });

    lab.step(0);
    await lab.do(tr('افتح صنبور بخار اليود ليملأ الوعاء.'), ['i2valve', 'i2']);
    snd.switch();
    o.inL.key.rotation.z = Math.PI / 2;
    await anim(2.2, k => { S.iod = k; });
    o.inL.key.rotation.z = 0;
    snd.switch();
    lab.log(tr('ملأ بخار اليود ذو اللون البنفسجي الوعاء.'));
    await lab.do(tr('أضف حجماً مساوياً من غاز الهدروجين عديم اللون: افتح صنبور الهدروجين.'), ['h2valve', 'h2']);
    snd.switch();
    o.inR.key.rotation.z = Math.PI / 2;
    await anim(1.0, k => { o.wheel.rotation.z = k * 4; });
    await anim(1.4, k => { S.h2 = k; });
    o.inR.key.rotation.z = 0;
    snd.switch();
    lab.log(tr('أضفتُ حجماً مساوياً من غاز الهدروجين عديم اللون، ثمّ أغلقتُ الوعاء.'));
    await lab.ask({
      q: tr('هل تغيّر اللون البنفسجي عند إضافة غاز الهدروجين قبل التسخين؟'),
      opts: [tr('لا، لأنّ غاز الهدروجين عديم اللون'), tr('نعم، أصبح اللون أحمر'), tr('نعم، اختفى اللون كلّياً'), tr('نعم، أصبح اللون أزرق')],
      right: 0, ours: true, why: tr('غاز الهدروجين عديم اللون، واللون البنفسجي لبخار اليود.'),
    });

    lab.step(1);
    await lab.do(tr('شغّل المسخّن الكهربائي، واضبطه على الدرجة 445 °C.'), 'heater');
    snd.switch();
    o.ctlLed.material.color.setHex(0xff5a3a);
    S.heat = true;
    lab.sim(true);
    const ch = lab.chart({ title: tr('شدّة اللون البنفسجي'), y: tr('الشدّة (%)'), yMin: 0, yMax: 100, yStep: 20, xMax: 60, color: '#a855f7' });
    let lp = -1;
    sc.onFrame(() => { if (S.t - lp > 0.5) { lp = S.t; ch.push(S.t, 100 * (1 - S.x)); ch.val(`${Math.round(S.T)} °C · ${Math.round(100 * (1 - S.x))}%`); } });
    lab.watch(tr('راقب اللون البنفسجي داخل الوعاء، والخطّ البياني.'));
    await lab.until(() => S.T >= 445 && S.x >= S.eq * 0.995);
    await lab.simWait(12);
    lab.sim(false);
    await lab.ask({
      q: tr('ماذا تلاحظ على اللون البنفسجي بعد التسخين إلى الدرجة {{445 °C}}؟'),
      opts: [tr('ينقص تدريجياً ثمّ يثبت'), tr('يختفي كلّياً'), tr('يزداد تدريجياً'), tr('لا يتغيّر أبداً')],
      right: 0, why: tr('نلاحظ أن اللون البنفسجي ينقص تدريجياً ثمّ يثبت.'),
    });
    lab.log(tr('بعد التسخين إلى [[445]] °C: ينقص اللون البنفسجي تدريجياً ثمّ يثبت (ولا يختفي).'));

    lab.step(2);
    const molBtn = await lab.toggle({ id: 'mol', label: tr('عرض الجزيئات'), icon: 'eye', text: tr('اضغط «عرض الجزيئات» في الأسفل لترى ما يحدث داخل الوعاء.') });
    molOn = true;
    o.mol.visible = true;
    await lab.fly(iodine.closeView, 1.2);
    molBtn.onChange = on => { molOn = on; o.mol.visible = on; };
    await lab.ask({
      q: tr('الشكل 1 (قبل التسخين): سمّ الجزيئات الغازية في الوعاء. الكرتان الزرقاوان ترمزان إلى [[I2]]، والكرتان الورديتان إلى [[H2]].'),
      opts: ['[[I2]]', '[[H2]]', '[[HI]]', '[[H]]', '[[I]]'],
      right: [0, 1], why: tr('قبل التفاعل يحوي الوعاء جزيئات [[I2]] وجزيئات [[H2]] فقط.'),
    });
    await lab.ask({
      q: tr('الشكل 2 (الآن): سمّ الجزيئات الغازية في الوعاء. الجزيء المؤلّف من كرة وردية وكرة زرقاء يرمز إلى [[HI]].'),
      opts: ['[[I2]]', '[[H2]]', '[[HI]]', '[[H]]', '[[I]]'],
      right: [0, 1, 2], why: tr('يحوي الوعاء الآن خليطاً من جزيئات [[H2]] و[[I2]] و[[HI]].'),
    });
    lab.log(tr('في الوعاء الآن خليط من [[I2]] و[[H2]] و[[HI]]، وبعض جزيئات [[HI]] تتفكّك بينما تتكوّن غيرها.'));

    lab.step(3);
    await lab.ask({
      q: tr('ما دلالة التناقص التدريجي للون البنفسجي، ثمّ ثباته؟'),
      opts: [tr('يتفاعل اليود مع الهدروجين ويتكوّن يود الهدروجين، الذي يتفكّك بالشروط ذاتها إلى اليود والهدروجين'), tr('استُهلك اليود كلّياً في التفاعل'), tr('تسرّب بخار اليود من الوعاء'), tr('توقّف التفاعل لأنّ الهدروجين نفد')],
      right: 0, why: tr('<b>ألاحظ:</b> يتفاعل اليود مع الهدروجين ويتكوّن يود الهدروجين، الذي يتفكّك بالشروط ذاتها إلى اليود و الهدروجين. أي أنَّ التفاعل يحدث باتجاهين متعاكسين (مباشر وعكسي).'),
    });
    await lab.ask({
      kicker: tr('المعادلة'),
      q: tr('أيّ معادلة تعبّر عن هذا التفاعل؟'),
      opts: ['[[I2(g) + H2(g) <=> 2HI(g)]]', '[[I2(g) + H2(g) -> 2HI(g)]]', '[[I2(g) + H2(g) <=> HI(g)]]', '[[2HI(g) -> I2(g) + H2(g)]]'],
      right: 0, keep: false, why: tr('التفاعل يحدث باتجاهين متعاكسين (مباشر وعكسي): [[I2(g) + H2(g) <=> 2HI(g)]]'),
    });
    await lab.ask({
      q: tr('ماذا تُسمّى التفاعلات التي تتمّ باتجاهين، حيث إنَّ المواد المتفاعلة لا تستهلك كلّياً، لأنّ المواد الناتجة تتفاعل فيما بينها لتعطي المواد المتفاعلة في الشروط ذاتها؟'),
      opts: [tr('التفاعلات العكوسة'), tr('التفاعلات التامة'), tr('تفاعلات الأكسدة'), tr('التغيّرات الفيزيائية')],
      right: 0, why: tr('هذه هي <b>التفاعلات العكوسة</b>.'),
    });
    await lab.ask({
      kicker: tr('نشاط (3)'),
      q: tr('اختر المُعادَلة الكيميائية المعبِّرة عن التفاعل العكوس بين غازي النتروجين والهدروجين في شروط مناسبة لتكوّن غاز النشادر.'),
      opts: ['[[N2(g) + 3H2(g) <=> 2NH3(g)]]', '[[N2(g) + 3H2(g) -> 2NH3(g)]]', '[[N2(g) + H2(g) <=> NH3(g)]]', '[[2N(g) + 3H2(g) <=> 2NH3(g)]]'],
      right: 0, ours: true, why: tr('التفاعل عكوس فنكتب السهمين، والمعادلة موزونة: ذرّتا نتروجين وست ذرّات هدروجين في الطرفين.'),
    });
  },
};

// ───────────────────────── 7. copper(II) oxide + charcoal (redox) ─────────────────────────
export const redox = {
  id: 'redox', section: '4-2', title: tr('تفاعلات الأكسدة والإرجاع'), subtitle: tr('أكسيد النحاس II ومسحوق الفحم'), page: '21–22', tag: tr('أكسدة وإرجاع'),
  tools: [tr('أنبوب اختبار'), tr('أكسيد النحاس II'), tr('مسحوق الفحم'), tr('موقد بنزن'), tr('أنبوب يحوي رائق الكلس')],
  steps: [
    tr('أخلطُ كميةً من أكسيد النحاس II مع كمّيةٍ مُناسِبةٍ من مسحوق الفحم.'),
    tr('أُركّب الجهاز المُبيّن في الشكل.'),
    tr('أُسخِّن الأنبوب الذي يحوي الخليط السابق لدرجة حرارة مُناسِبة، ماذا أُلاحظ؟'),
    tr('على ماذا يدلّ تعكّر رائق الكلس؟ ما اسم المادة الحمراء الناتجة؟'),
    tr('ألاحظ من المُعادَلة: أنَّ الكربون اكتسب الأكسجين، بينما أكسيد النحاس فقد الأكسجين.'),
  ],
  result: [
    '[[C(s) + 2CuO(s) ->[Δ] CO2(g) + 2Cu(s)]]',
    tr('<b>أستنتج:</b> يتفاعل مسحوق الفحم مع أكسيد النحاس II، وينطلق غاز ثنائي أكسيد الكربون الذي يُعكّر رائق الكلس، وينتج النحاس الأحمر.'),
    tr('العملية التي تكتسب فيها المادة الأكسجين تُسمّى تفاعل أكسدة. العملية التي تفقد فيها المادة الأكسجين تُسمّى تفاعل إرجاع. عمليتا الأكسدة والإرجاع متلازمتان.'),
  ],
  view: { pos: [0.0, 1.24, 0.6], target: [0.03, 1.03, -0.07] },

  build(sc) {
    const o = {};
    const tz = -0.06, ty = B + 0.175, closed = 0.1;
    o.stand = K.stand({ h: 0.36 });
    o.stand.group.position.set(0.0, B, -0.21);
    sc.add(o.stand.group);
    o.stand.clamp(ty - B, 0.216, 0, 0.009);
    o.burner = K.bunsen({ hose: V(0.08, 0, -0.24) });
    o.burner.group.position.set(0.072, B, tz);
    sc.add(o.burner.group);
    sc.pickable(o.burner.group, 'burner', tr('موقد بنزن'));
    // horizontal test tube, closed end over the flame, mouth to the left
    o.tube = K.testTube({ r: 0.0085, L: 0.15 });
    o.tube.group.rotation.z = Math.PI / 2 - 0.05;
    o.tube.group.position.set(closed, ty, tz);
    sc.add(o.tube.group);
    sc.pickable(o.tube.group, 'tube', tr('أنبوب اختبار'));
    o.tube.group.updateMatrixWorld(true);
    o.mouth = wp(o.tube.group, V(0, o.tube.mouth, 0));
    // powder lying in the tube
    o.mixMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.95, map: K.powderTex('#bbbbbb', ['#ffffff', '#7a7a7a', '#e0e0e0']), emissive: 0x000000 });
    o.mound = K.mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.046, 18), o.mixMat, { cast: false });
    o.mound.rotation.z = Math.PI / 2 - 0.05;
    o.mound.scale.set(1, 1, 0.55);
    o.mound.position.copy(wp(o.tube.group, V(0, 0.028, 0))).add(V(0, -0.004, 0));
    o.mound.scale.set(0.0001, 1, 0.0001);
    sc.add(o.mound);
    // stopper with a bent delivery tube, built in its final pose then laid on the bench
    o.dt = new THREE.Group();
    const st = K.stopper({ r0: 0.0068, r1: 0.0092, h: 0.016 });
    st.group.rotation.z = -Math.PI / 2;
    st.group.position.x = 0.01;
    o.dt.add(st.group);
    const path = [V(-0.004, 0, 0), V(-0.03, 0, 0), V(-0.058, -0.004, 0), V(-0.08, -0.025, 0), V(-0.09, -0.07, 0), V(-0.092, -0.142, 0)];
    o.dt.add(K.glassTube(path, 0.0026).mesh);
    o.dtAt = { p: o.mouth.clone().add(V(-0.002, 0, 0)), q: new THREE.Quaternion() };
    o.tip = o.dtAt.p.clone().add(V(-0.092, -0.142, 0));
    o.dt.position.set(-0.3, B + 0.012, 0.16);
    o.dt.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    sc.add(o.dt);
    sc.pickable(o.dt, 'stopper', tr('سدادة مع أنبوب توصيل'));
    // limewater beaker
    o.lime = K.beaker({ r: 0.026, h: 0.075, grad: false });
    const tag = K.plate(0.032, 0.014, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; drawFormula(g, 'Ca(OH)2', w / 2, h * 0.68, h * 0.55); }, 256);
    tag.position.set(0, 0.03, 0.0265);
    o.lime.group.add(tag);
    o.lime.liquid.color(0xe2eff4).opacity(0.50).set(0.05);
    o.lime.group.position.set(-0.33, B, 0.03);
    sc.add(o.lime.group);
    sc.pickable(o.lime.group, 'lime', tr('رائق الكلس [[Ca(OH)2]]'));
    o.limeAt = V(o.tip.x, B, tz);
    // jars, dish, spatula
    o.cuo = powderJar(tr('أكسيد النحاس II'), 'CuO', '#151515', ['#2a2a2a', '#050505', '#3a3a3a']);
    o.cuo.group.position.set(0.24, B, -0.12);
    o.cuo.group.rotation.y = -0.25;
    sc.add(o.cuo.group);
    sc.pickable(o.cuo.group, 'cuo', tr('أكسيد النحاس II'));
    o.coal = powderJar(tr('مسحوق الفحم'), 'C', '#202020', ['#3b3b3b', '#0b0b0b', '#474747']);
    o.coal.group.position.set(0.35, B, -0.04);
    o.coal.group.rotation.y = -0.4;
    sc.add(o.coal.group);
    sc.pickable(o.coal.group, 'coal', tr('مسحوق الفحم'));
    o.dish = K.dish({ r: 0.04, h: 0.02 });
    o.dish.group.position.set(0.24, B, 0.07);
    sc.add(o.dish.group);
    sc.pickable(o.dish.group, 'dish', tr('طبق الخلط'));
    o.dishHeap = K.mesh(new THREE.SphereGeometry(0.022, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: K.powderTex('#1a1a1a', ['#333', '#000', '#444']) }), { cast: false });
    o.dishHeap.scale.set(1, 0.0001, 1);
    o.dishHeap.position.y = o.dish.bottom;
    o.dish.group.add(o.dishHeap);
    o.spat = K.spatula();
    o.spat.group.position.set(0.1, B + 0.002, 0.12);
    o.spat.group.rotation.y = Math.PI / 2 + 0.25;
    sc.add(o.spat.group);
    o.heap = heapOn(o.spat, 0x161616);
    o.grains = grains(sc, { color: 0x151515, size: 0.0012 });
    o.bub = bubbles(o.lime.group, { n: 30, size: 0.0014, speed: 0.06, area: () => { const p = o.lime.group.worldToLocal(o.tip.clone()); return { x: p.x, z: p.z, r: 0.002, y0: p.y, y1: o.lime.liquid.level }; } });
    return o;
  },

  async run(lab, o) {
    lab.step(0);
    const dishTop = () => wp(o.dish.group, V(0, o.dish.bottom + 0.008, 0));
    await lab.do(tr('ضع كمية من أكسيد النحاس II في طبق الخلط.'), 'cuo');
    await scoop({ spatula: o.spat, heap: o.heap, grains: o.grains, from: wp(o.cuo.group, V(0, 0.05, 0)), to: dishTop(), floorY: B + o.dish.bottom, onDrop: () => anim(0.4, k => o.dishHeap.scale.set(1, 0.18 * k + 0.0001, 1)) });
    await lab.do(tr('أضف كمية مُناسِبة من مسحوق الفحم.'), 'coal');
    await scoop({ spatula: o.spat, heap: o.heap, grains: o.grains, from: wp(o.coal.group, V(0, 0.05, 0)), to: dishTop(), floorY: B + o.dish.bottom, onDrop: () => anim(0.4, k => o.dishHeap.scale.set(1, 0.18 + 0.14 * k, 1)) });
    await lab.do(tr('اخلط المسحوقين في الطبق.'), 'dish');
    const g = o.spat.group, home = { p: g.position.clone(), q: g.quaternion.clone() };
    const c = wp(o.dish.group, V(0, 0.02, 0));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.9, Math.PI, 0, 'YXZ'));
    snd.powder();
    await anim(1.6, k => { const a = k * Math.PI * 6; g.quaternion.copy(q); g.position.copy(c).add(V(Math.cos(a) * 0.012, 0.0, Math.sin(a) * 0.012)).sub(o.spat.tip.position.clone().applyQuaternion(q)); });
    await moveTo(g, home.p, 0.6, { rot: home.q });
    lab.log(tr('خلطتُ أكسيد النحاس II (أسود) مع مسحوق الفحم (أسود).'));
    await lab.do(tr('انقل الخليط إلى أنبوب الاختبار المثبّت على الحامل.'), 'tube');
    await scoop({ spatula: o.spat, heap: o.heap, grains: o.grains, from: wp(o.dish.group, V(0, 0.02, 0)), to: o.mouth.clone().add(V(0.01, 0.0, 0)), floorY: o.mouth.y - 0.006, count: 10, onDrop: () => anim(0.6, k => { o.mound.scale.set(Math.max(0.0001, k), 1, 0.55 * Math.max(0.0001, k)); o.dishHeap.scale.y = Math.max(0.0001, 0.32 * (1 - k)); }) });

    lab.step(1);
    await lab.do(tr('أغلق فوهة الأنبوب بالسدادة التي يخرج منها أنبوب التوصيل.'), 'stopper');
    await moveTo(o.dt, o.dtAt.p, 1.2, { lift: 0.12, rot: o.dtAt.q });
    snd.place();
    await lab.do(tr('ضع كأس رائق الكلس بحيث يُغمس طرف أنبوب التوصيل فيه.'), 'lime');
    await moveTo(o.lime.group, o.limeAt, 1.0, { lift: 0.04 });
    snd.glass();
    lab.log(tr('ركّبتُ الجهاز: الأنبوب أفقي على الحامل، وأنبوب التوصيل مغموس في رائق الكلس.'));

    lab.step(2);
    await lab.do(tr('سخّن الأنبوب الذي يحوي الخليط.'), 'burner');
    await lightBurner(o.burner);
    const S = { t: 0, on: true, milk: 0, red: 0 };
    lab.sc.onFrame((dt, sdt) => {
      if (S.on) S.t += sdt;
      const t = S.t;
      const heat = S.on ? Math.min(1, t / 6) : Math.max(0, (o.mixMat.emissive.r / 0.6) - dt / 3);
      o.mixMat.emissive.setRGB(0.6 * heat, 0.16 * heat, 0.02 * heat);
      if (S.on && t > 7) S.milk = Math.min(1, (t - 7) / 24);
      if (S.on && t > 12) S.red = Math.min(1, (t - 12) / 26);
      o.lime.liquid.color(lerpC(0xe2eff4, 0xf3f3f1, S.milk)).opacity(0.5 + 0.42 * S.milk);
      o.mixMat.color.copy(lerpC(0x1b1b1c, 0x9c4a26, S.red * 0.85));
      o.bub.rate = S.on && t > 5 ? 1.1 : 0;
    });
    lab.sim(true);
    lab.watch(tr('راقب الخليط في الأنبوب، ورائق الكلس في الكأس.'));

    lab.step(3);
    await lab.until(() => S.milk >= 0.7);
    await lab.ask({
      q: tr('على ماذا يدلّ تعكّر رائق الكلس؟'),
      opts: [tr('انطلاق غاز ثنائي أكسيد الكربون'), tr('انطلاق غاز الهدروجين'), tr('انطلاق غاز الأكسجين'), tr('تبخّر رائق الكلس')],
      right: 0, why: tr('ينطلق غاز ثنائي أكسيد الكربون الذي يُعكّر رائق الكلس.'),
    });
    lab.log(tr('تعكّر رائق الكلس: انطلق غاز ثنائي أكسيد الكربون [[CO2]].'));
    await lab.until(() => S.red >= 0.95);
    lab.sim(false);
    await lab.ask({
      q: tr('ما اسم المادة الحمراء الناتجة في الأنبوب؟'),
      opts: [tr('النحاس'), tr('أكسيد النحاس II'), tr('الكربون'), tr('كربونات الكالسيوم')],
      right: 0, why: tr('يتفاعل مسحوق الفحم مع أكسيد النحاس II ... وينتج <b>النحاس الأحمر</b>.'),
    });
    lab.log(tr('تحوّل الخليط الأسود إلى مادة حمراء: النحاس.'));
    await lab.do(tr('انتهى التفاعل. أنهِ التسخين بأمان.'), 'lime', {
      unsafe: { burner: tr('أبعد كأس رائق الكلس عن طرف أنبوب التوصيل <b>قبل</b> إيقاف التسخين؛ وإلا قد يُسحب السائل البارد إلى الأنبوب الساخن فينكسر.') },
      kicker: tr('السلامة'),
    });
    await moveTo(o.lime.group, o.limeAt.clone().add(V(-0.08, 0, 0.1)), 0.9, { lift: 0.06 });
    o.bub.rate = 0;
    await lab.do(tr('أطفئ موقد بنزن.'), 'burner');
    await offBurner(o.burner);
    S.on = false;

    lab.step(4);
    await lab.ask({
      kicker: tr('المعادلة'),
      q: tr('[[C(s) + 2CuO(s) ->[Δ] CO2(g) + 2Cu(s)]] — أيّ مادة اكتسبت الأكسجين؟ وماذا يُسمّى تفاعلها؟'),
      opts: [tr('الكربون، ويُسمّى تفاعلها أكسدة'), tr('الكربون، ويُسمّى تفاعلها إرجاعاً'), tr('أكسيد النحاس II، ويُسمّى تفاعله أكسدة'), tr('أكسيد النحاس II، ويُسمّى تفاعله إرجاعاً')],
      right: 0, why: tr('الكربون اكتسب الأكسجين. العملية التي تكتسب فيها المادة الأكسجين تُسمّى <b>تفاعل أكسدة</b>.'),
    });
    await lab.ask({
      q: tr('وأيّ مادة فقدت الأكسجين؟ وماذا يُسمّى تفاعلها؟'),
      opts: [tr('أكسيد النحاس II، ويُسمّى تفاعله إرجاعاً'), tr('أكسيد النحاس II، ويُسمّى تفاعله أكسدة'), tr('الكربون، ويُسمّى تفاعله إرجاعاً'), tr('ثنائي أكسيد الكربون، ويُسمّى تفاعله إرجاعاً')],
      right: 0, why: tr('أكسيد النحاس فقد الأكسجين. العملية التي تفقد فيها المادة الأكسجين تُسمّى <b>تفاعل إرجاع</b>.'),
    });
    await lab.ask({
      q: tr('عمليتا الأكسدة والإرجاع:'),
      opts: [tr('متلازمتان'), tr('منفصلتان، تحدث كلّ منهما وحدها'), tr('تحدث الأكسدة فقط عند التسخين'), tr('لا علاقة بينهما')],
      right: 0, why: tr('عمليتا الأكسدة والإرجاع <b>متلازمتان</b>.'),
    });
    await lab.ask({
      kicker: tr('نشاط (4)'),
      q: tr('يتفاعل أكسيد الحديد III مع أحادي أكسيد الكربون: [[Fe2O3(s) + 3CO(g) -> 3CO2(g) + 2Fe(s)]]. حدّد المادة التي اكتسبت الأكسجين، وماذا يُسمّى تفاعلها؟'),
      opts: [tr('[[CO]]، ويُسمّى تفاعلها أكسدة'), tr('[[CO]]، ويُسمّى تفاعلها إرجاعاً'), tr('[[Fe2O3]]، ويُسمّى تفاعله أكسدة'), tr('[[Fe]]، ويُسمّى تفاعله أكسدة')],
      right: 0, ours: true, why: tr('أحادي أكسيد الكربون [[CO]] اكتسب الأكسجين فأصبح [[CO2]]: تفاعل أكسدة.'),
    });
    await lab.ask({
      kicker: tr('نشاط (4)'),
      q: tr('حدّد المادة التي فقدت الأكسجين، وماذا يُسمّى تفاعلها؟'),
      opts: [tr('[[Fe2O3]]، ويُسمّى تفاعله إرجاعاً'), tr('[[Fe2O3]]، ويُسمّى تفاعله أكسدة'), tr('[[CO]]، ويُسمّى تفاعله إرجاعاً'), tr('[[CO2]]، ويُسمّى تفاعله إرجاعاً')],
      right: 0, ours: true, why: tr('أكسيد الحديد III [[Fe2O3]] فقد الأكسجين فأصبح حديداً [[Fe]]: تفاعل إرجاع.'),
    });
  },
};

