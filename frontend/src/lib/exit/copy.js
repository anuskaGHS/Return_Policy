// Every sentence on the Smart Exit page that carries a number, in English and Hindi side by side.
// All functions take the view model `v` (lib/exit/model.js) and a language ('en' | 'hi') and return plain text.
// The numbers come from v.r (the result of calculateLocalExitAnalysis); nothing is calculated here except display sums.
import { inr, plural, fmtDate } from './format.js';

const mk = (lang) => (en, hi) => (lang === 'hi' ? hi : en);

/** The "Quick summary": plain words made from the numbers alone. Also the text shown when the AI cannot answer. */
export function plainText(v, lang) {
  const L = mk(lang);
  const { r, dd, T, short, hold, eq, flip, oc, netWait } = v;
  const load = r.exit_load_amount;
  const pt = r.projected_tax_if_wait;

  if (v.lock) {
    const li = r.lock_in;
    return L(
      `Your ELSS units are locked in for 3 years from purchase, so you cannot sell for ${plural(v.rem, 'more day')}. You can sell from ${fmtDate(v.unlockD, false)}. If your fund’s value stays flat, selling then costs ${inr(li.cost_when_unlocked)} and you would receive ${inr(li.net_when_unlocked)}.`,
      `आपकी ELSS यूनिट ख़रीद से 3 साल के लॉक-इन में हैं, इसलिए ${v.rem} दिन और नहीं बेच सकते। आप ${fmtDate(v.unlockD, true)} से बेच सकेंगे। अगर फ़ंड का मूल्य स्थिर रहा, तब बेचने पर ${inr(li.cost_when_unlocked)} ख़र्च होंगे और आपको ${inr(li.net_when_unlocked)} मिलेंगे।`,
    );
  }
  if (!eq) {
    const why = r.bought_before_apr_2023
      ? ['These units were bought before 1 April 2023, so gains are taxed at the 12.5% long-term rate.', 'ये यूनिट 1 अप्रैल 2023 से पहले ख़रीदी गई थीं, इसलिए मुनाफ़े पर 12.5% की लंबी अवधि की दर से टैक्स लगता है।']
      : ['Debt fund units bought on or after 1 April 2023 are taxed at your slab rate, however long you hold them.', 'डेट फ़ंड की जो यूनिट 1 अप्रैल 2023 या उसके बाद ख़रीदी गईं, उन पर रखने की अवधि चाहे जो हो, आपके स्लैब दर से टैक्स लगता है।'];
    return L(
      `${why[0]} If you sell today, you pay ${inr(r.current_tax)} in tax${load > 0 ? ` and ${inr(load)} in exit load` : ''}. Waiting will not change the tax. You would receive ${inr(r.net_inhand_now)}.`,
      `${why[1]} आज बेचने पर आप ${inr(r.current_tax)} टैक्स${load > 0 ? ` और ${inr(load)} एग्ज़िट लोड` : ''} देंगे। रुकने से टैक्स नहीं बदलेगा। आपको ${inr(r.net_inhand_now)} मिलेंगे।`,
    );
  }
  if (flip) {
    return L(
      `Waiting would save you ${inr(r.potential_savings)} in tax and exit load, but the ${inr(r.net_inhand_now)} you get today could earn about ${inr(oc)} elsewhere in ${plural(dd, 'day')}. Selling today comes out ahead by ${inr(-netWait)}. This assumes your fund’s value stays flat.`,
      `रुकने से टैक्स और एग्ज़िट लोड में ${inr(r.potential_savings)} बचते, लेकिन आज मिलने वाले ${inr(r.net_inhand_now)} दूसरी जगह ${dd} दिन में लगभग ${inr(oc)} कमा सकते हैं। आज बेचना ${inr(-netWait)} से आगे रहता है। यह मानकर चला गया है कि फ़ंड का मूल्य स्थिर रहेगा।`,
    );
  }
  if (hold) {
    const withinFree = pt <= 0 && r.gain > 0;
    const reasonEn = withinFree ? ', because your gain is within the ₹1.25L tax-free limit' : '';
    const reasonHi = withinFree ? ', क्योंकि आपका मुनाफ़ा ₹1.25L की टैक्स-मुक्त सीमा के भीतर है' : '';
    const en =
      `If you sell today, you pay ${inr(r.current_tax)} in ${r.tax_type} tax${load > 0 ? ` and ${inr(load)} in exit load` : ''}. ` +
      `If you wait ${plural(dd, 'more day')}, ${load > 0 ? 'the exit load goes away and ' : ''}you pay ${pt > 0 ? `${inr(pt)} in long-term tax` : `no tax${reasonEn}`}. ` +
      `That saves you ${inr(r.potential_savings)}.` +
      (oc > 0 ? ` Even after about ${inr(oc)} you could earn elsewhere in that time, waiting comes out ahead by ${inr(netWait)}.` : '') +
      ' This assumes your fund’s value stays flat.';
    const hin =
      `आज बेचने पर आप ${inr(r.current_tax)} ${r.tax_type} टैक्स${load > 0 ? ` और ${inr(load)} एग्ज़िट लोड` : ''} देंगे। ` +
      `अगर आप ${dd} दिन और रुकते हैं, तो ${load > 0 ? 'एग्ज़िट लोड हट जाएगा और ' : ''}${pt > 0 ? `आपको लंबी अवधि का टैक्स ${inr(pt)} देना होगा` : `आपको कोई टैक्स नहीं देना होगा${reasonHi}`}। ` +
      `इससे आपके ${inr(r.potential_savings)} बचते हैं।` +
      (oc > 0 ? ` उस दौरान दूसरी जगह लगभग ${inr(oc)} कमाने की संभावना गिनने पर भी रुकना ${inr(netWait)} से आगे रहता है।` : '') +
      ' यह मानकर चला गया है कि फ़ंड का मूल्य स्थिर रहेगा।';
    return L(en, hin);
  }
  if (short) {
    return L(
      `Waiting would not make this cheaper. Selling today costs ${inr(r.total_cost_now)}, and waiting costs ${inr(r.total_cost_if_wait)}. You would receive ${inr(r.net_inhand_now)}.`,
      `रुकने से यह सस्ता नहीं होगा। आज बेचने पर ${inr(r.total_cost_now)} ख़र्च होंगे, और रुकने पर ${inr(r.total_cost_if_wait)}। आपको ${inr(r.net_inhand_now)} मिलेंगे।`,
    );
  }
  return L(
    `You are past day ${T}, so the ${r.tax_rate_applied_pct}% long-term rate applies. Selling now costs ${inr(r.total_cost_now)} in tax and exit load together. Waiting would not make it cheaper. You would receive ${inr(r.net_inhand_now)}.`,
    `आप दिन ${T} पार कर चुके हैं, इसलिए ${r.tax_rate_applied_pct}% की लंबी अवधि की दर लगेगी। अभी बेचने पर टैक्स और एग्ज़िट लोड मिलाकर ${inr(r.total_cost_now)} लगेगा। रुकने से यह सस्ता नहीं होगा। आपको ${inr(r.net_inhand_now)} मिलेंगे।`,
  );
}

/** What the page says while one or both amounts are blank. */
export function emptyCopy(v, lang) {
  const L = mk(lang);
  const MSG = [
    [
      ['Enter both amounts', 'दोनों राशियाँ डालें'],
      ['Enter your amounts', 'अपनी राशियाँ डालें'],
      ['Tell us what you invested and what it is worth today. Our call, the cost chart and the comparison appear here.', 'बताइए आपने कितना निवेश किया और आज उसका मूल्य क्या है। हमारी सलाह, लागत का चार्ट और तुलना यहीं दिखेगी।'],
      ['Enter what you invested and what it is worth today, and we will explain your result here.', 'आपने कितना निवेश किया और आज उसका मूल्य क्या है, यह डालें। नतीजा हम यहाँ समझाएँगे।'],
    ],
    [
      ['Enter what you invested', 'आपने कितना निवेश किया, यह डालें'],
      ['Enter what you invested', 'आपने कितना निवेश किया, यह डालें'],
      ['Worth today is filled in. Add how much you invested, and our call, the cost chart and the comparison appear here.', 'आज का मूल्य भर दिया गया है। बताइए आपने कितना निवेश किया, फिर हमारी सलाह, लागत का चार्ट और तुलना यहीं दिखेगी।'],
      ['Add what you invested and we will explain your result here.', 'आपने कितना निवेश किया, यह डालें। नतीजा हम यहाँ समझाएँगे।'],
    ],
    [
      ['Enter what it is worth today', 'आज उसका मूल्य क्या है, यह डालें'],
      ['Enter what it is worth today', 'आज उसका मूल्य क्या है, यह डालें'],
      ['Invested is filled in. Add what the fund is worth today, and our call, the cost chart and the comparison appear here.', 'निवेश की राशि भर दी गई है। बताइए आज फ़ंड का मूल्य क्या है, फिर हमारी सलाह, लागत का चार्ट और तुलना यहीं दिखेगी।'],
      ['Add what it is worth today and we will explain your result here.', 'आज उसका मूल्य क्या है, यह डालें। नतीजा हम यहाँ समझाएँगे।'],
    ],
  ][v.missingCase];
  return { chip: L(...MSG[0]), head: L(...MSG[1]), body: L(...MSG[2]), ai: L(...MSG[3]) };
}

/** The "Our call" card: pill, big word, label, number, note, ribbon, and the dial. */
export function verdictCopy(v, lang) {
  const L = mk(lang);
  const { r, dd, T, short, hold, flip, oc, debt, lock, rem } = v;
  const out = {};
  out.pill = lock ? L('3-year lock-in', '3 साल का लॉक-इन') : L(`${r.tax_type} · ${r.tax_rate_applied_pct}% tax`, `${r.tax_type} · ${r.tax_rate_applied_pct}% टैक्स`);
  out.word = lock ? L('Can’t sell yet', 'अभी नहीं बेच सकते') : hold ? L('Hold', 'होल्ड करें') : L('Exit now', 'अभी बेचें');
  out.small = !hold; // the long "Can't sell yet" / "Exit now" words use the smaller size
  out.ribOk = false;
  if (lock) {
    const li = r.lock_in;
    out.label = L('Lock-in ends in', 'लॉक-इन ख़त्म होने में');
    out.numKind = 'days';
    out.numValue = rem;
    out.note = L(
      `ELSS units are locked in for 3 years from the date you bought them, so you cannot sell yet. You can sell from ${fmtDate(v.unlockD, false)}. If your fund’s value stays flat, selling then would cost ${inr(li.cost_when_unlocked)} and you would receive ${inr(li.net_when_unlocked)}.`,
      `ELSS यूनिट ख़रीद की तारीख़ से 3 साल के लॉक-इन में रहती हैं, इसलिए अभी बेच नहीं सकते। आप ${fmtDate(v.unlockD, true)} से बेच सकेंगे। अगर फ़ंड का मूल्य स्थिर रहा, तब बेचने पर ${inr(li.cost_when_unlocked)} ख़र्च होंगे और आपको ${inr(li.net_when_unlocked)} मिलेंगे।`,
    );
    out.ribbon = L(`Locked for ${plural(rem, 'more day')}`, `${rem} दिन और लॉक-इन`);
  } else if (hold) {
    out.label = L('Tax and load saved by waiting', 'रुकने से टैक्स और लोड में बचत');
    out.numKind = 'money';
    out.numValue = r.potential_savings;
    out.note = L(
      `Selling today costs ${inr(r.current_tax)} in tax${r.exit_load_amount > 0 ? ` and ${inr(r.exit_load_amount)} in exit load` : ''}. After ${plural(dd, 'more day')}, ${r.exit_load_amount > 0 ? 'the exit load goes and ' : ''}the tax drops to the long-term rate.`,
      `आज बेचने पर ${inr(r.current_tax)} टैक्स${r.exit_load_amount > 0 ? ` और ${inr(r.exit_load_amount)} एग्ज़िट लोड` : ''} लगेगा। ${dd} दिन और रुकने पर ${r.exit_load_amount > 0 ? 'एग्ज़िट लोड हट जाएगा और ' : ''}टैक्स लंबी अवधि की दर पर आ जाएगा।`,
    );
    out.ribbon = L(`Hold ${plural(dd, 'more day')}`, `${dd} दिन और रुकें`);
  } else {
    out.label = L('You receive if you sell today', 'आज बेचने पर आपको मिलेंगे');
    out.numKind = 'money';
    out.numValue = r.net_inhand_now;
    out.ribOk = true;
    if (short) {
      out.note = flip
        ? L(
          `Waiting saves ${inr(r.potential_savings)} in tax and exit load, but the money you get today could earn about ${inr(oc)} elsewhere in ${plural(dd, 'day')}. Selling now comes out ahead.`,
          `रुकने से ${inr(r.potential_savings)} टैक्स और एग्ज़िट लोड बचता है, लेकिन आज मिलने वाला पैसा दूसरी जगह ${dd} दिन में लगभग ${inr(oc)} कमा सकता है। अभी बेचना आगे रहता है।`,
        )
        : L('Waiting would not lower what you pay on this fund, so there is nothing to gain by holding on.', 'रुकने से इस फ़ंड पर आपका ख़र्च कम नहीं होगा, इसलिए रुकने का कोई फ़ायदा नहीं।');
    } else {
      out.note = L(
        `You are past day ${T}, so the long-term rate applies and the exit load is gone. Waiting will not make this cheaper.`,
        `आप दिन ${T} पार कर चुके हैं, इसलिए लंबी अवधि की दर लगेगी और एग्ज़िट लोड हट चुका है। रुकने से यह सस्ता नहीं होगा।`,
      );
    }
    out.ribbon = short
      ? (flip ? L('Waiting does not pay', 'रुकना फ़ायदे का नहीं') : L('Waiting saves ₹0', 'रुकने से ₹0 की बचत'))
      : L(`Past day ${T}. Sell when you need to`, `दिन ${T} पार। ज़रूरत हो तब बेचें`);
    if (debt) {
      out.note = r.bought_before_apr_2023
        ? L('These units were bought before 1 April 2023, so the 12.5% long-term rate applies. Waiting will not change your tax.', 'ये यूनिट 1 अप्रैल 2023 से पहले ख़रीदी गई थीं, इसलिए 12.5% की लंबी अवधि की दर लगती है। रुकने से आपका टैक्स नहीं बदलेगा।')
        : L('Debt fund units bought on or after 1 April 2023 are taxed at your slab rate, however long you hold them. Waiting will not lower the tax.', 'डेट फ़ंड की जो यूनिट 1 अप्रैल 2023 या उसके बाद ख़रीदी गईं, उन पर रखने की अवधि चाहे जो हो, आपके स्लैब दर से टैक्स लगता है। रुकने से टैक्स कम नहीं होगा।');
      out.ribbon = L('Waiting does not change your tax', 'रुकने से टैक्स नहीं बदलता');
    }
  }
  return out;
}

/** The dial: how many ticks are filled, and the text in the middle. */
export function dialCopy(v, days, lang) {
  const L = mk(lang);
  const { dd, T, lock, rem, debt } = v;
  const past = !lock && (debt || days > T);
  const filled = lock ? Math.round((days / 1095) * 60) : past ? 60 : Math.round(Math.min(1, days / T) * 60);
  let mid;
  if (debt) {
    mid = { small: L('Debt fund', 'डेट फ़ंड'), big: L('Flat', 'समान'), span: L('same tax any day', 'किसी भी दिन समान टैक्स') };
  } else {
    const small = lock ? L(`Day ${days} of 1,095`, `दिन ${days} / 1,095`) : L(`Day ${days} of ${T}`, `दिन ${days} / ${T}`);
    mid = lock
      ? { small, big: String(rem), span: L(rem === 1 ? 'day of lock-in' : 'days of lock-in', 'दिन का लॉक-इन') }
      : past
        ? { small, big: L('Open', 'खुला'), span: L('long-term window', 'लंबी अवधि शुरू') }
        : { small, big: String(dd), span: L(dd === 1 ? 'day to go' : 'days to go', 'दिन बाकी') };
  }
  return { filled, past, mid };
}

/** Option A (sell today) and Option B (wait). */
export function optionsCopy(v, days, lang) {
  const L = mk(lang);
  const { r, dd, T, gate, hold, taxHold, oc, debt } = v;
  const rate = r.interest_rate_pct;
  const row = (k, label, value, tot) => ({ k, label, value, tot: !!tot });

  const aLines = [
    row('tax', L(`${r.tax_type} tax (${r.tax_rate_applied_pct}%)`, `${r.tax_type} टैक्स (${r.tax_rate_applied_pct}%)`), inr(r.current_tax)),
    row('load', L(`Exit load (${r.exit_load_pct}%)`, `एग्ज़िट लोड (${r.exit_load_pct}%)`), inr(r.exit_load_amount)),
  ];
  if (r.ltcg_exemption_applied > 0) aLines.push(row('free', L('Tax-free part of your gain', 'आपके मुनाफ़े का टैक्स-मुक्त हिस्सा'), inr(r.ltcg_exemption_applied)));
  if (taxHold) {
    if (oc > 0) aLines.push(row('int', L(`Interest elsewhere (${rate}% for ${plural(dd, 'day')})`, `दूसरी जगह ब्याज (${rate}%, ${dd} दिन)`), `+${inr(oc)}`));
    aLines.push(row('after', L(`You have after ${plural(dd, 'day')}`, `${dd} दिन बाद आपके पास`), inr(r.net_inhand_now + oc), true));
  }

  let bLines;
  if (gate) {
    bLines = [
      row('ltcg', L('Long-term tax (12.5%)', 'लंबी अवधि का टैक्स (12.5%)'), inr(r.projected_tax_if_wait)),
      row('load', L('Exit load after the gate', 'सीमा के बाद एग्ज़िट लोड'), inr(r.projected_exit_load_if_wait)),
    ];
    if (taxHold) bLines.push(row('after', L(`You have after ${plural(dd, 'day')}`, `${dd} दिन बाद आपके पास`), inr(r.net_inhand_if_wait), true));
  } else {
    bLines = [
      row('tax', L(`${r.tax_type} tax (${r.tax_rate_applied_pct}%)`, `${r.tax_type} टैक्स (${r.tax_rate_applied_pct}%)`), inr(r.current_tax)),
      row('load', L(`Exit load (${r.exit_load_pct}%)`, `एग्ज़िट लोड (${r.exit_load_pct}%)`), inr(r.exit_load_amount)),
    ];
  }

  let bTitle = gate ? L('Wait for the gate', 'सीमा तक रुकें') : L('Wait longer', 'और रुकें');
  let bSub = gate ? L(`Day ${T + 1} and after`, `दिन ${T + 1} और उसके बाद`) : L('Already past the gate', 'सीमा पहले ही पार');
  let bNote = gate
    ? L('Assumes the fund’s value stays flat. Real returns will move.', 'मान लिया गया है कि फ़ंड का मूल्य स्थिर रहेगा। असली रिटर्न बदलेगा।') +
      (taxHold ? L(' Interest uses the rate in your custom settings.', ' ब्याज के लिए कस्टम सेटिंग की दर इस्तेमाल हुई है।') : '')
    : L('Nothing changes after the gate, so there is no reason to wait for tax.', 'सीमा के बाद कुछ नहीं बदलता, इसलिए टैक्स के लिए रुकने की ज़रूरत नहीं।');
  if (debt) {
    bTitle = L('Wait, then sell', 'रुकें, फिर बेचें');
    bSub = L('Any later day', 'बाद का कोई भी दिन');
    bNote = L('Nothing changes if you wait, so there is no reason to wait for tax.', 'रुकने से कुछ नहीं बदलता, इसलिए टैक्स के लिए रुकने की ज़रूरत नहीं।');
  }

  return {
    a: {
      sub: L(`Day ${days}`, `दिन ${days}`),
      big: r.total_cost_now,
      keep: inr(r.net_inhand_now),
      lines: aLines,
      note: L(`Taken out of ${inr(r.current_value)}, what your fund is worth today.`, `${inr(r.current_value)} में से, जो आज आपके फ़ंड का मूल्य है।`),
      best: !hold,
    },
    b: { title: bTitle, sub: bSub, big: r.total_cost_if_wait, keep: inr(r.net_inhand_if_wait), lines: bLines, note: bNote, best: hold },
  };
}

/** "The bottom line" card (not shown while an ELSS lock-in stops any sale). */
export function worthCopy(v, lang) {
  const L = mk(lang);
  const { r, hold, taxHold, netWait } = v;
  const rate = r.interest_rate_pct;
  if (taxHold) {
    const pct = r.current_value > 0 ? ((Math.abs(netWait) / r.current_value) * 100).toFixed(1) : '0.0';
    return {
      head: hold ? L(`Waiting wins by ${inr(netWait)}`, `रुकना ${inr(netWait)} से आगे`) : L(`Selling today wins by ${inr(-netWait)}`, `आज बेचना ${inr(-netWait)} से आगे`),
      note: hold
        ? L(
          `Waiting still pays if your fund falls by less than ${inr(netWait)} (${pct}% of its value) before then. A bigger fall can wipe out the gain.`,
          `अगर तब तक आपके फ़ंड का मूल्य ${inr(netWait)} (${pct}%) से कम गिरता है, तो रुकना फिर भी फ़ायदे का है। इससे बड़ी गिरावट पूरा फ़ायदा मिटा सकती है।`,
        )
        : null,
      foot: L(
        `Interest is simple interest at ${rate}% a year, before tax on that interest. Your fund is assumed to stay flat. You can change the rate in the custom settings.`,
        `ब्याज साधारण ब्याज है, ${rate}% सालाना, उस ब्याज पर टैक्स से पहले। मान लिया गया है कि फ़ंड का मूल्य स्थिर रहेगा। दर कस्टम सेटिंग में बदल सकते हैं।`,
      ),
    };
  }
  const ld0 = r.exit_load_amount > 0;
  return {
    head: L('Waiting saves ₹0', 'रुकने से ₹0 की बचत'),
    note: L(
      `Selling today costs ${inr(r.total_cost_now)}${ld0 ? ' in tax and exit load together' : ' in tax'}, so you receive ${inr(r.net_inhand_now)}. Waiting does not change this, so sell when you need the money.`,
      `आज बेचने पर ${inr(r.total_cost_now)}${ld0 ? ' टैक्स और एग्ज़िट लोड मिलाकर' : ' टैक्स'} लगेगा, इसलिए आपको ${inr(r.net_inhand_now)} मिलेंगे। रुकने से यह नहीं बदलेगा, इसलिए ज़रूरत हो तब बेचें।`,
    ),
    foot: L('Your fund is assumed to stay flat. Real returns will move.', 'मान लिया गया है कि फ़ंड का मूल्य स्थिर रहेगा। असली रिटर्न बदलेगा।'),
  };
}

/** The three rule tiles. While locked they describe the rule that applies once the lock ends. */
export function ruleTiles(v, loadText, lang) {
  const L = mk(lang);
  const { short, free, pre } = v.rules;
  const yes = { text: L('Applies to you', 'आप पर लागू') };
  if (v.eq) {
    const ex = free > 0
      ? L(` ${inr(free)} of your gain is tax-free.`, ` आपके मुनाफ़े के ${inr(free)} टैक्स-मुक्त हैं।`)
      : '';
    const custom = loadText !== null; // the user typed an exit load
    const tile3 = v.elss
      ? {
        cls: 'r3', kick: L('Exit load', 'एग्ज़िट लोड'), tag: { text: L('No load', 'कोई लोड नहीं') }, big: '0%',
        p: L('The ELSS schemes we checked list no exit load, so we use 0%. Confirm in your fund’s SID.', 'हमने जो ELSS फ़ंड देखे, उनमें कोई एग्ज़िट लोड नहीं है, इसलिए हम 0% मानते हैं। अपने फ़ंड के SID में जाँच लें।'),
        foot: L('Check it in the SID, KIM or factsheet', 'SID, KIM या फ़ैक्टशीट में जाँचें'),
      }
      : {
        cls: 'r3', kick: L('Exit load', 'एग्ज़िट लोड'), tag: custom ? null : { text: L('Assumed', 'अनुमान'), warn: true }, big: custom ? `${loadText}%` : '1%',
        p: custom
          ? L('The load you entered. It is used in the numbers above.', 'यह आपका डाला हुआ लोड है। ऊपर के आँकड़ों में यही इस्तेमाल हुआ है।')
          : L('We assume 1% if you sell within a year, only as an example. Each fund sets its own, so enter yours under “Custom exit load and interest rate”.', 'हम 1 वर्ष के भीतर बेचने पर 1% मान लेते हैं, सिर्फ़ उदाहरण के लिए। हर फ़ंड का अपना लोड होता है, इसलिए अपना लोड “अपना एग्ज़िट लोड और ब्याज दर” में डालें।'),
        foot: custom ? L('Check it in the SID, KIM or factsheet', 'SID, KIM या फ़ैक्टशीट में जाँचें') : L('Find yours in the SID, KIM or factsheet', 'अपना लोड SID, KIM या फ़ैक्टशीट में देखें'),
      };
    return [
      { cls: 'r1', kick: L('Held 1 year or less', '1 वर्ष या उससे कम रखा'), tag: short ? yes : null, big: '20%', p: L('Tax on your gain. Called STCG.', 'आपके मुनाफ़े पर टैक्स। इसे STCG कहते हैं।'), foot: L('Rate since 23 July 2024', '23 जुलाई 2024 से लागू दर') },
      { cls: 'r2', kick: L('Held over 1 year', '1 वर्ष से ज़्यादा रखा'), tag: !short ? yes : null, big: '12.5%', p: L('On gains above ₹1.25L a year. Called LTCG.', 'साल में ₹1.25L से ऊपर के मुनाफ़े पर। इसे LTCG कहते हैं।') + ex, foot: L('Rate since 23 July 2024', '23 जुलाई 2024 से लागू दर') },
      tile3,
    ];
  }
  const slabTxt = `${v.inp.applicable_slab_rate_pct}%`;
  return [
    { cls: 'r1', kick: L('Bought from 1 Apr 2023', '1 अप्रैल 2023 से ख़रीदा'), tag: !pre ? yes : null, big: slabTxt, p: L('Taxed at your income tax slab, however long you hold the fund.', 'रखने की अवधि चाहे जो हो, आपके इनकम टैक्स स्लैब से टैक्स लगता है।'), foot: L('Slab rate', 'स्लैब दर') },
    { cls: 'r2', kick: L('Bought before 1 Apr 2023', '1 अप्रैल 2023 से पहले ख़रीदा'), tag: pre ? yes : null, big: '12.5%', p: L('Long-term rate after 24 months, with no indexation benefit.', '24 महीने के बाद लंबी अवधि की दर, इंडेक्सेशन के फ़ायदे के बिना।'), foot: L('Rate since 23 July 2024', '23 जुलाई 2024 से लागू दर') },
    { cls: 'r3', kick: L('Check your fund', 'अपना फ़ंड जाँचें'), tag: { text: L('Verify', 'जाँचें'), warn: true }, big: '65%', p: L('These rules are for funds that put more than 65% of their money in debt and money market instruments. Hybrid, gold and international funds can be taxed differently.', 'ये नियम उन फ़ंड के लिए हैं जो 65% से ज़्यादा पैसा डेट और मनी मार्केट साधनों में लगाते हैं। हाइब्रिड, गोल्ड और इंटरनेशनल फ़ंड पर टैक्स अलग हो सकता है।'), foot: L('Check the SID or factsheet for the debt share', 'डेट हिस्सेदारी के लिए SID या फ़ैक्टशीट देखें') },
  ];
}
