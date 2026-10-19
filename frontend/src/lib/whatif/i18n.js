// Hindi for the What-if page. English strings in the components are the keys: t('Reset default') shows the
// Hindi text when the page language is 'hi' and the English text otherwise. A missing key falls back to English.
// SIP and EMI are written in Devanagari (एसआईपी, ईएमआई) because the backend's Hindi text uses the same spelling.
// CAGR, STCG, LTCG, SEBI and AI stay in Latin letters.
// Sentences that carry numbers (the score reason, notes, action rules) live in copy.js, not here.

const HI = {
  // header, footer, nav
  'Home': 'होम',
  'About Platform': 'प्लेटफ़ॉर्म के बारे में',
  'Decision Engine': 'डिसीज़न इंजन',
  'Primary': 'मुख्य मेनू',
  'Language': 'भाषा',
  '© 2026 Return Policy — AI-Powered Household Finance Decision Engine.': '© 2026 Return Policy — AI-संचालित घरेलू वित्त निर्णय इंजन।',
  'Return Policy is an informational tool only. AI-generated outputs are educational and do not constitute SEBI-registered financial advice.': 'Return Policy केवल एक सूचनात्मक टूल है। AI द्वारा बनाए गए नतीजे शैक्षणिक हैं और SEBI-पंजीकृत वित्तीय सलाह नहीं हैं।',
  'Standard 12% CAGR equity compounding is illustrative. Always consult a qualified financial advisor before major financial commitments.': '12% CAGR पर इक्विटी कंपाउंडिंग केवल उदाहरण के लिए है। बड़े वित्तीय फ़ैसलों से पहले किसी योग्य वित्तीय सलाहकार से ज़रूर सलाह लें।',

  // tool tabs
  'What-If Policy Simulator': 'व्हाट-इफ़ पॉलिसी सिमुलेटर',
  'Smart Exit & Hold Tax Advisor': 'स्मार्ट एग्ज़िट और होल्ड टैक्स एडवाइज़र',
  'Decision Engine tools': 'डिसीज़न इंजन के टूल',

  // heading
  'Simulator heading': 'सिमुलेटर का शीर्षक',
  'Live simulation engine': 'लाइव सिमुलेशन इंजन',
  'What if your money…': 'अगर आपका पैसा…',
  'Household balance sheet & policy simulator': 'घरेलू बैलेंस शीट और पॉलिसी सिमुलेटर',
  'See your 3 actions': 'अपने 3 कदम देखें',
  'Reset default': 'डिफ़ॉल्ट पर लौटें',

  // controls card
  'Financial parameters input': 'वित्तीय पैरामीटर इनपुट',
  'Financial policy sliders': 'वित्तीय पॉलिसी स्लाइडर',
  'QUICK PERSONA PRESETS': 'त्वरित पर्सोना प्रीसेट',
  'Deselect ': 'चयन हटाएँ: ',
  'Early Career': 'करियर की शुरुआत',
  'Balanced Builder': 'संतुलित निर्माता',
  'Aggressive Saver': 'आक्रामक बचतकर्ता',
  'High Debt Stress': 'भारी कर्ज़ का दबाव',
  'Monthly SIP investment': 'मासिक एसआईपी निवेश',
  'Monthly loan EMI': 'मासिक लोन ईएमआई',
  'Weighted loan interest rate': 'औसत लोन ब्याज दर',
  'Annual household income': 'परिवार की सालाना आय',
  'Min: ₹1,000': 'न्यूनतम: ₹1,000',
  'Max: ₹50,000 / mo': 'अधिकतम: ₹50,000 / माह',
  'Min: ₹0': 'न्यूनतम: ₹0',
  'Max: ₹1,00,000 / mo': 'अधिकतम: ₹1,00,000 / माह',
  '5.0% (Subsidized)': '5.0% (रियायती)',
  '15.0% (Unsecured/High)': '15.0% (असुरक्षित/ऊँची)',
  '₹3.0 Lakhs': '₹3.0 लाख',
  '₹50.0 Lakhs / yr': '₹50.0 लाख / वर्ष',
  'EMI share of income (limit 30%)': 'आय में ईएमआई का हिस्सा (सीमा 30%)',
  'Term cover vs 10× income': 'टर्म कवर बनाम 10× आय',
  '× income': '× आय',
  'More income lightens your EMI share but raises the cover you need. Both feed the score, so they can cancel out.': 'आय बढ़ने से ईएमआई का हिस्सा हल्का होता है, पर ज़रूरी कवर बढ़ जाता है। दोनों स्कोर में जुड़ते हैं, इसलिए एक-दूसरे को काट सकते हैं।',

  // wealth stage and chart
  '5-year SIP wealth projection': '5 साल की एसआईपी संपत्ति का अनुमान',
  '5-year projected wealth': '5 साल में अनुमानित संपत्ति',
  '12% CAGR · compounding': '12% CAGR · कंपाउंडिंग',
  'default plan': 'डिफ़ॉल्ट योजना',
  ' vs default': ' बनाम डिफ़ॉल्ट',
  'Total principal invested (60 mo)': 'कुल निवेशित मूलधन (60 माह)',
  'Estimated wealth gain': 'अनुमानित संपत्ति लाभ',
  'Chart of SIP corpus, amount invested and cumulative loan interest over 5 years': '5 साल में एसआईपी कॉर्पस, निवेश की गई राशि और जमा लोन ब्याज का चार्ट',
  'Now': 'अभी',
  'Year ': 'साल ',
  'Today': 'आज',
  'Month ': 'माह ',
  'SIP corpus': 'एसआईपी कॉर्पस',
  'Invested': 'निवेश',
  'Loan interest': 'लोन ब्याज',
  'Amount invested': 'निवेश की गई राशि',
  'Loan interest paid': 'चुकाया गया लोन ब्याज',

  // health score card
  'Financial health score': 'वित्तीय हेल्थ स्कोर',
  'Health score': 'हेल्थ स्कोर',
  'OUT OF 100': '100 में से',
  'Critical Debt Stress': 'गंभीर ऋण तनाव',
  'Vulnerable Leveraged': 'असुरक्षित उत्तोलन',
  'Balanced Saver': 'संतुलित बचतकर्ता',
  'Solid Wealth Builder': 'मजबूत धन निर्माता',
  'Financially Resilient': 'आर्थिक रूप से सुदृढ़',

  // ratio card
  'EMI to income ratio': 'आय में ईएमआई का अनुपात',
  'EMI-to-income': 'आय में ईएमआई का अनुपात',
  'Healthy': 'स्वस्थ',
  'Caution': 'सावधानी',
  'High risk': 'उच्च जोखिम',
  'Safe <30%': 'सुरक्षित <30%',
  'Caution 30–45%': 'सावधानी 30–45%',
  'High risk >45%': 'उच्च जोखिम >45%',
  'Over the 30% safe limit by': '30% की सुरक्षित सीमा से ऊपर',
  'Room under the 30% safe limit': '30% सुरक्षित सीमा के भीतर गुंजाइश',
  ' / mo': ' / माह',
  'Bringing EMI down by this much puts you back in the safe zone.': 'ईएमआई इतनी घटाने पर आप फिर सुरक्षित ज़ोन में आ जाएँगे।',
  'You could add this much EMI and still stay in the safe zone.': 'आप इतनी और ईएमआई ले सकते हैं और फिर भी सुरक्षित ज़ोन में रहेंगे।',
  'Est. annual interest drag': 'अनुमानित सालाना ब्याज का बोझ',

  // score breakdown card
  'Score breakdown': 'स्कोर का ब्रेकडाउन',
  '5 parts · 100 points': '5 हिस्से · 100 अंक',
  'Hide the details': 'विवरण छिपाएँ',
  'How each part is scored': 'हर हिस्से का स्कोर कैसे बनता है',
  'out of 100': '100 में से',
  'Move a slider to see which part pulls your score up or down.': 'स्लाइडर हिलाकर देखें कि कौन-सा हिस्सा आपका स्कोर बढ़ा या घटा रहा है।',
  'pts': 'अंक',
  'Biggest drag': 'सबसे बड़ा नुकसान',
  'SIP return vs benchmark': 'बेंचमार्क के मुक़ाबले एसआईपी रिटर्न',
  'Loan-to-income ratio': 'आय के मुक़ाबले लोन का अनुपात',
  'Insurance adequacy': 'बीमा की पर्याप्तता',
  'Tax efficiency': 'टैक्स दक्षता',
  'Emergency fund': 'इमरजेंसी फंड',
  'SIP return so far': 'अब तक का एसआईपी रिटर्न',
  'Term insurance cover': 'टर्म इंश्योरेंस कवर',
  'Investments held 1+ year': '1+ साल से रखे निवेश',
  '25% / yr': '25% / वर्ष',
  '₹5Cr': '₹5 करोड़',
  '12 months': '12 माह',
  ' month': ' माह',
  ' months': ' माह',
  'EMI share of income': 'आय में ईएमआई का हिस्सा',
  'Set by the EMI and income sliders.': 'यह ईएमआई और आय के स्लाइडर से तय होता है।',

  // mini bar
  '5-yr wealth': '5 साल की संपत्ति',
  'Health': 'हेल्थ',

  // action plan
  'Personal policy action plan': 'आपका निजी पॉलिसी एक्शन प्लान',
  '3 tailored rules': '3 अनुकूल नियम',
  '3 AI-tailored rules': 'AI द्वारा बनाए 3 नियम',
  'No drag:': 'कोई नुकसान नहीं:',
  'every part of the score is at full marks.': 'स्कोर का हर हिस्सा पूरे अंकों पर है।',
  'Biggest drag:': 'सबसे बड़ा नुकसान:',
  'Key vulnerability:': 'मुख्य कमज़ोरी:',
  'AI is preparing your plan…': 'AI आपका प्लान तैयार कर रहा है…',
  'AI is writing a note…': 'AI आपके लिए नोट लिख रहा है…',
  "AI couldn't answer this time. This plan is calculated from your score breakdown, using standard thresholds (EMI under 30% of income, cover of 10× income, 6 months of emergency savings).": 'AI इस बार जवाब नहीं दे पाया। यह प्लान आपके स्कोर ब्रेकडाउन से, मानक सीमाओं (आय का 30% से कम ईएमआई, 10× आय का कवर, 6 माह का इमरजेंसी फंड) के आधार पर निकाला गया है।',
};

export const HI_STRINGS = HI;

// t for a language: returns the Hindi text when lang is 'hi' and the key exists, otherwise the English key.
export function tr(lang, s) {
  return lang === 'hi' && Object.prototype.hasOwnProperty.call(HI, s) ? HI[s] : s;
}
