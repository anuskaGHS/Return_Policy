// Every sentence on the What-if page that depends on the numbers.
// Functions return "parts": an array of plain strings and { b: 'bold text' } objects.
// <Rich parts={...} /> turns them into text with <b>. No HTML strings, no dangerouslySetInnerHTML.
// Every function takes `lang` last ('en' by default). The Hindi wording is in the HI block below.
import { inr, compact, short } from './format.js';
import { BENCHMARK_PCT, COVER_MULTIPLE, EMERGENCY_TARGET_MONTHS } from './healthScore.js';
import { tr } from './i18n.js';

const B = (s) => ({ b: String(s) });
const plural = (n, one, many) => (n === 1 ? one : many);

// ---------------------------------------------------------------- English
const EN = {
  turnLine(d) {
    return 'turned ' + compact(d.inv) + ' into ' + compact(d.fv) + '?';
  },

  sentence(d) {
    const loan = d.emi > 0
      ? ['with your loan costing about ', B(inr(d.drag)), ' a year in interest.']
      : ['with no loan interest pulling against it.'];
    return ['Your ', B(inr(d.P)), ' SIP over five years, ', ...loan];
  },

  why(d) {
    return [
      'Your score is ', B(d.score + '/100'), '. Strongest part: ', B(d.strong.name), ' (' + d.strong.pts + '/' + d.strong.max + '). ',
      ...(d.weak.key
        ? ['Biggest drag: ', B(d.weak.name), ' (' + d.weak.pts + '/' + d.weak.max + '), ' + d.weak.lost + ' points lost.']
        : ['Every part is at full marks.']),
    ];
  },

  noteFor(key, d) {
    if (key === 'sip') {
      return [B(d.sret.toFixed(1) + '%'), ' a year against a ', B(BENCHMARK_PCT + '%'), ' benchmark. Past return only: the projection above assumes a flat ' + BENCHMARK_PCT + '%.'];
    }
    if (key === 'loan') {
      return ['EMI takes ', B(d.ratio.toFixed(1) + '%'), ' of income. Full marks at 0%, nothing at 60% or more. The safe limit is 30%.'];
    }
    if (key === 'ins') {
      const need = COVER_MULTIPLE * d.inc;
      const gap = Math.max(0, need - d.cover);
      return ['Cover ', B(short(d.cover)), ' against ', B(short(need)), ' suggested (' + COVER_MULTIPLE + '× income).', ...(gap > 0 ? [' Gap ', B(short(gap)), '.'] : [' Meets the guideline.'])];
    }
    if (key === 'tax') {
      return [B(d.lt + '%'), ' of investments held 1+ year. Equity units sold within a year pay 20% STCG; after a year, 12.5% LTCG above ₹1.25L of gains.'];
    }
    return [B(d.em), ' ' + plural(d.em, 'month', 'months') + ' saved against a ' + EMERGENCY_TARGET_MONTHS + '-month guideline.'];
  },

  ruleFor(c, d) {
    if (c.max - c.pts === 0) return ['Keep ' + c.name + ' at full marks', ['Already at ', B(c.max + '/' + c.max), '. No change needed.']];
    if (c.key === 'sip') {
      return ['Review your SIP return', ['Your SIP returned ', B(d.sret.toFixed(1) + '%'), ' a year against a ', B(BENCHMARK_PCT + '%'), ' benchmark. Compare it with a low-cost index fund and switch if the gap lasts.']];
    }
    if (c.key === 'loan') {
      return ['Cut the EMI burden', ['EMI is ', B(d.ratio.toFixed(1) + '%'), ' of income. Prepay an extra ', B(inr(d.emi * 0.2)), ' (20% of ' + inr(d.emi) + ') toward principal each month to shorten the loan and lower interest.']];
    }
    if (c.key === 'ins') {
      return ['Close the term-cover gap', ['Raise term cover from ', B(short(d.cover)), ' to ', B(short(COVER_MULTIPLE * d.inc)), ' (' + COVER_MULTIPLE + '× income). The gap is ', B(short(Math.max(0, COVER_MULTIPLE * d.inc - d.cover))), '.']];
    }
    if (c.key === 'tax') {
      return ['Hold investments past 1 year', ['Only ', B(d.lt + '%'), ' is held 1+ year. Selling after 12 months pays 12.5% LTCG (above ₹1.25L of gains) instead of 20% STCG.']];
    }
    const more = Math.max(0, EMERGENCY_TARGET_MONTHS - d.em);
    return ['Build a ' + EMERGENCY_TARGET_MONTHS + '-month emergency fund', ['You hold ', B(d.em), ' ' + plural(d.em, 'month', 'months') + '. Add ', B(more), ' more ' + plural(more, 'month', 'months') + ' of expenses in a liquid fund.']];
  },

  dragLine(d) {
    const w = d.weak;
    if (!w.key) return null;
    const one = {
      sip: 'Your SIP return trails the ' + BENCHMARK_PCT + '% benchmark.',
      loan: 'EMI takes ' + d.ratio.toFixed(1) + '% of income and costs about ' + inr(d.drag) + ' a year in interest.',
      ins: 'Term cover is ' + short(d.cover) + ' against ' + short(COVER_MULTIPLE * d.inc) + ' suggested, a ' + short(Math.max(0, COVER_MULTIPLE * d.inc - d.cover)) + ' gap.',
      tax: 'Only ' + d.lt + '% of your investments are held 1+ year, so more gains face the 20% STCG rate.',
      emg: 'You hold ' + d.em + ' of the suggested ' + EMERGENCY_TARGET_MONTHS + ' months of expenses.',
    }[w.key];
    return [B('Biggest drag:'), ' ' + w.name + ' (' + w.lost + ' of ' + w.max + ' points lost). ' + one];
  },
};

// ---------------------------------------------------------------- Hindi
// SIP and EMI are spelled एसआईपी and ईएमआई, like the backend's Hindi text. Numbers keep Latin digits.
const HI = {
  turnLine(d) {
    return compact(d.inv, 'hi') + ' से ' + compact(d.fv, 'hi') + ' बन जाए?';
  },

  sentence(d) {
    const loan = d.emi > 0
      ? ['जबकि आपका लोन हर साल लगभग ', B(inr(d.drag)), ' ब्याज में ले जाता है।']
      : ['और लोन का कोई ब्याज इसके ख़िलाफ़ नहीं है।'];
    return ['आपकी ', B(inr(d.P)), ' की मासिक एसआईपी पाँच साल में, ', ...loan];
  },

  why(d) {
    return [
      'आपका स्कोर ', B(d.score + '/100'), ' है। सबसे मज़बूत हिस्सा: ', B(tr('hi', d.strong.name)), ' (' + d.strong.pts + '/' + d.strong.max + ')। ',
      ...(d.weak.key
        ? ['सबसे बड़ा नुकसान: ', B(tr('hi', d.weak.name)), ' (' + d.weak.pts + '/' + d.weak.max + '), ' + d.weak.lost + ' अंक कम।']
        : ['हर हिस्सा पूरे अंकों पर है।']),
    ];
  },

  noteFor(key, d) {
    if (key === 'sip') {
      return [B(d.sret.toFixed(1) + '%'), ' सालाना रिटर्न, जबकि बेंचमार्क ', B(BENCHMARK_PCT + '%'), ' है। यह सिर्फ़ पिछला रिटर्न है; ऊपर का अनुमान ' + BENCHMARK_PCT + '% की सपाट दर मानता है।'];
    }
    if (key === 'loan') {
      return ['ईएमआई आपकी आय का ', B(d.ratio.toFixed(1) + '%'), ' लेती है। 0% पर पूरे अंक, 60% या उससे ऊपर शून्य। सुरक्षित सीमा 30% है।'];
    }
    if (key === 'ins') {
      const need = COVER_MULTIPLE * d.inc;
      const gap = Math.max(0, need - d.cover);
      return ['कवर ', B(short(d.cover, 'hi')), ', जबकि सुझाया गया ', B(short(need, 'hi')), ' (' + COVER_MULTIPLE + '× आय) है।', ...(gap > 0 ? [' कमी ', B(short(gap, 'hi')), ' की है।'] : [' दिशानिर्देश पूरा है।'])];
    }
    if (key === 'tax') {
      return [B(d.lt + '%'), ' निवेश 1+ साल से रखे हैं। एक साल के भीतर बेचे गए इक्विटी यूनिट पर 20% STCG लगता है; एक साल बाद ₹1.25 लाख के लाभ से ऊपर 12.5% LTCG।'];
    }
    return [B(d.em), ' माह की बचत, जबकि दिशानिर्देश ' + EMERGENCY_TARGET_MONTHS + ' माह का है।'];
  },

  ruleFor(c, d) {
    if (c.max - c.pts === 0) return [tr('hi', c.name) + ' को पूरे अंकों पर रखें', ['अभी ', B(c.max + '/' + c.max), ' पर है। किसी बदलाव की ज़रूरत नहीं।']];
    if (c.key === 'sip') {
      return ['अपने एसआईपी रिटर्न की समीक्षा करें', ['आपकी एसआईपी ने सालाना ', B(d.sret.toFixed(1) + '%'), ' दिया, जबकि बेंचमार्क ', B(BENCHMARK_PCT + '%'), ' है। किसी कम-लागत वाले इंडेक्स फंड से तुलना करें और अंतर बना रहे तो बदल दें।']];
    }
    if (c.key === 'loan') {
      return ['ईएमआई का बोझ घटाएँ', ['ईएमआई आपकी आय का ', B(d.ratio.toFixed(1) + '%'), ' है। मूलधन चुकाने के लिए हर माह अतिरिक्त ', B(inr(d.emi * 0.2)), ' (' + inr(d.emi) + ' का 20%) दें, ताकि लोन जल्दी ख़त्म हो और ब्याज घटे।']];
    }
    if (c.key === 'ins') {
      return ['टर्म कवर की कमी भरें', ['टर्म कवर ', B(short(d.cover, 'hi')), ' से बढ़ाकर ', B(short(COVER_MULTIPLE * d.inc, 'hi')), ' (' + COVER_MULTIPLE + '× आय) करें। कमी ', B(short(Math.max(0, COVER_MULTIPLE * d.inc - d.cover), 'hi')), ' की है।']];
    }
    if (c.key === 'tax') {
      return ['निवेश 1 साल से ज़्यादा रखें', ['सिर्फ़ ', B(d.lt + '%'), ' निवेश 1+ साल से रखा है। 12 माह बाद बेचने पर 20% STCG की जगह 12.5% LTCG (₹1.25 लाख के लाभ से ऊपर) लगता है।']];
    }
    const more = Math.max(0, EMERGENCY_TARGET_MONTHS - d.em);
    return [EMERGENCY_TARGET_MONTHS + ' माह का इमरजेंसी फंड बनाएँ', ['आपके पास ', B(d.em), ' माह का फंड है। लिक्विड फंड में ', B(more), ' माह के ख़र्च और जोड़ें।']];
  },

  dragLine(d) {
    const w = d.weak;
    if (!w.key) return null;
    const one = {
      sip: 'आपका एसआईपी रिटर्न ' + BENCHMARK_PCT + '% के बेंचमार्क से पीछे है।',
      loan: 'ईएमआई आपकी आय का ' + d.ratio.toFixed(1) + '% लेती है और सालाना लगभग ' + inr(d.drag) + ' ब्याज में जाता है।',
      ins: 'टर्म कवर ' + short(d.cover, 'hi') + ' है, जबकि सुझाया गया ' + short(COVER_MULTIPLE * d.inc, 'hi') + ' है, यानी ' + short(Math.max(0, COVER_MULTIPLE * d.inc - d.cover), 'hi') + ' की कमी।',
      tax: 'सिर्फ़ ' + d.lt + '% निवेश 1+ साल से रखे हैं, इसलिए ज़्यादा लाभ पर 20% STCG लगेगा।',
      emg: 'सुझाए गए ' + EMERGENCY_TARGET_MONTHS + ' माह के ख़र्च में से आपके पास ' + d.em + ' माह हैं।',
    }[w.key];
    return [B('सबसे बड़ा नुकसान:'), ' ' + tr('hi', w.name) + ' (' + w.max + ' में से ' + w.lost + ' अंक कम)। ' + one];
  },
};

const pick = (lang) => (lang === 'hi' ? HI : EN);

export const turnLine = (d, lang) => pick(lang).turnLine(d);
export const sentence = (d, lang) => pick(lang).sentence(d);
export const why = (d, lang) => pick(lang).why(d);
export const noteFor = (key, d, lang) => pick(lang).noteFor(key, d);
export const ruleFor = (c, d, lang) => pick(lang).ruleFor(c, d);
export const dragLine = (d, lang) => pick(lang).dragLine(d);

// The three rules are the three parts that lose the most points, biggest first.
export function rules(d, lang) {
  return d.comps
    .slice()
    .sort((a, b) => b.max - b.pts - (a.max - a.pts))
    .slice(0, 3)
    .map((c) => ruleFor(c, d, lang));
}
