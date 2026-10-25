const en = {
  eyebrow: 'Loan vs investment', h1a: 'Prepay your loan, or', h1b: 'invest the extra?',
  lede: 'Enter your home loan and the extra money you have each month. We compare both options side by side, after tax on the gains.',
  pill: 'Example numbers · change them to your own', panelTitle: 'Your numbers', panelSub: 'Four details about your loan and one assumption.',
  fields: [
    { label: 'Loan still to pay (₹)', help: '' }, { label: 'Interest rate (% a year)', help: '' },
    { label: 'Time left (months)', help: '= 15 years' }, { label: 'Extra money each month (₹)', help: 'What is left after your EMI that you could prepay or invest.' },
    { label: 'Expected equity return (% a year)', help: 'An assumption, not a promise. Try 8 or 15 to see how the answer changes.' },
  ],
  fill: 'Use my numbers from My Finances', compare: 'Compare', calcNote: 'All numbers come from our own calculation.', optionA: 'Option A', optionB: 'Option B', kick: 'On these assumptions', prepay: 'Prepay', invest: 'Invest', ahead: 'Ahead on these assumptions',
  winnerInvest: 'Investing comes out ahead', winnerPrepay: 'Prepaying comes out ahead', winnerTie: 'Both options end with the same money',
  vlabelInvest: 'After {years}, investing the extra money ends up with', vlabelPrepay: 'After {years}, prepaying the loan ends up with',
  vafterInvest: 'more than prepaying the loan, after tax on the gains.', vafterPrepay: 'more than investing the extra money, after tax on the gains.',
  beTitle: 'Break-even return', rowLabels: ['Loan closes in', 'Interest paid on the loan', 'Investment value at the end', 'Tax on gains (LTCG)', 'Money you end up with'],
  prepayText: 'Put the extra money into the loan until it is closed. After that, invest the full EMI plus the extra money.',
  investText: 'Pay the normal EMI and invest the extra money every month, for the full time.',
  pwTitle: 'In plain words', chip: 'Summary', pwNote: 'This summary is written by our own code from the calculated numbers above.', notesTitle: 'What we assumed',
  disclaimer: 'This is a comparison under the assumptions above, not financial advice. Confirm tax rules before you act.',
  loading: 'Comparing…', slow: 'The server is waking up. The first request can take up to a minute.', invalid: 'Please check the numbers and try again.', failed: 'Something went wrong while comparing. Please try again.', offline: 'We could not reach the server. It may be waking up or your connection may be down.', retry: 'Try again', errTitle: 'Could not compare',
  errPrincipal: 'Enter an amount above 0.', errRate: 'Enter a rate from 0 to 100.', errMonths: 'Enter whole months from 1 to 480.', errSurplus: 'Enter an amount above 0. With no extra money, both options are the same.', errReturn: 'Enter a return from 0 to 100.',
  noFinances: 'No loan numbers found. Add your documents in My Finances first.', filledFinances: 'Filled from My Finances. Check the numbers, then press Compare.', stale: 'You changed the numbers. Press Compare to update the result.',
  loanMarkT: 'Loan rate {rate}%', beMarkT: 'Break-even {be}%', youMarkT: 'Your assumption {cagr}%', scaleAriaT: 'Scale from {lo}% to {hi}% a year', yearOne: 'year', yearMany: 'years', monthOne: 'month', monthMany: 'months', closesRow: '{duration} (month {n})',
};

const hi = { ...en,
  eyebrow: 'लोन बनाम निवेश', h1a: 'लोन जल्दी चुकाएँ, या', h1b: 'अतिरिक्त रकम निवेश करें?', lede: 'अपना होम लोन और हर महीने की अतिरिक्त रकम डालें। हम दोनों विकल्पों की तुलना, मुनाफ़े पर टैक्स के बाद, साथ-साथ दिखाते हैं।', pill: 'उदाहरण के आँकड़े · अपने आँकड़े डालें', panelTitle: 'आपके आँकड़े', panelSub: 'लोन के चार विवरण और एक अनुमान।',
  fields: [{ label: 'बाकी लोन (₹)', help: '' }, { label: 'ब्याज दर (% सालाना)', help: '' }, { label: 'बचा समय (महीने)', help: '= 15 साल' }, { label: 'हर महीने अतिरिक्त रकम (₹)', help: 'EMI के बाद बची रकम, जिसे आप लोन में दे सकते हैं या निवेश कर सकते हैं।' }, { label: 'अपेक्षित इक्विटी रिटर्न (% सालाना)', help: 'यह अनुमान है, वादा नहीं। 8 या 15 डालकर देखें कि जवाब कैसे बदलता है।' }],
  fill: 'मेरे My Finances के आँकड़े लें', compare: 'तुलना करें', calcNote: 'सारे आँकड़े हमारी अपनी गणना से आते हैं।', optionA: 'विकल्प A', optionB: 'विकल्प B', kick: 'इन अनुमानों पर', prepay: 'लोन जल्दी चुकाएँ', invest: 'निवेश करें', ahead: 'इन अनुमानों पर आगे', winnerInvest: 'निवेश आगे रहा', winnerPrepay: 'लोन जल्दी चुकाना आगे रहा', winnerTie: 'दोनों विकल्पों में अंत में बराबर रकम', vlabelInvest: '{years} बाद, अतिरिक्त रकम निवेश करने पर', vlabelPrepay: '{years} बाद, लोन जल्दी चुकाने पर', vafterInvest: 'लोन जल्दी चुकाने से ज़्यादा, मुनाफ़े पर टैक्स के बाद।', vafterPrepay: 'अतिरिक्त रकम निवेश करने से ज़्यादा, मुनाफ़े पर टैक्स के बाद।', beTitle: 'ब्रेक-ईवन रिटर्न', rowLabels: ['लोन बंद होगा', 'लोन पर चुकाया ब्याज', 'अंत में निवेश की कीमत', 'मुनाफ़े पर टैक्स (LTCG)', 'अंत में आपके हाथ में'], prepayText: 'लोन बंद होने तक अतिरिक्त रकम लोन में डालें। उसके बाद पूरी EMI और अतिरिक्त रकम निवेश करें।', investText: 'सामान्य EMI भरें और पूरे समय हर महीने अतिरिक्त रकम निवेश करें।', pwTitle: 'आसान शब्दों में', chip: 'सार', pwNote: 'यह सार ऊपर के आँकड़ों से हमारे अपने कोड ने लिखा है।', notesTitle: 'हमने क्या मान लिया', disclaimer: 'यह ऊपर के अनुमानों पर आधारित तुलना है, वित्तीय सलाह नहीं। कदम उठाने से पहले टैक्स नियम जाँच लें।', loading: 'तुलना हो रही है…', slow: 'सर्वर जाग रहा है। पहले अनुरोध में एक मिनट तक लग सकता है।', invalid: 'कृपया आँकड़े जाँचकर फिर कोशिश करें।', failed: 'तुलना करते समय कुछ गड़बड़ हो गई। फिर कोशिश करें।', offline: 'हम सर्वर तक नहीं पहुँच सके। हो सकता है वह जाग रहा हो या आपका कनेक्शन बंद हो।', retry: 'फिर कोशिश करें', errTitle: 'तुलना नहीं हो सकी', errPrincipal: '0 से अधिक रकम डालें।', errRate: '0 से 100 के बीच दर डालें।', errMonths: '1 से 480 के बीच पूरे महीने डालें।', errSurplus: '0 से अधिक रकम डालें। बिना अतिरिक्त रकम के दोनों विकल्प एक जैसे हैं।', errReturn: '0 से 100 के बीच रिटर्न डालें।', noFinances: 'लोन के आँकड़े नहीं मिले। पहले My Finances में दस्तावेज़ जोड़ें।', filledFinances: 'My Finances से आँकड़े भरे गए। जाँचकर तुलना करें।', stale: 'आपने आँकड़े बदले हैं। नतीजा अपडेट करने के लिए तुलना करें।', loanMarkT: 'लोन दर {rate}', beMarkT: 'ब्रेक-ईवन {be}', youMarkT: 'आपका अनुमान {cagr}', scaleAriaT: '{lo}% से {hi}% सालाना पैमाना', yearOne: 'साल', yearMany: 'साल', monthOne: 'महीना', monthMany: 'महीने', closesRow: '{duration} में (महीना {n})',
};

export const copy = { en, hi };
export const getCopy = (lang) => copy[lang === 'hi' ? 'hi' : 'en'];

