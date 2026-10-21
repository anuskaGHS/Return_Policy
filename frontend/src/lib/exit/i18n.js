// Hindi for the Smart Exit page. The English text in the components is the key: t('Your fund') gives the Hindi text
// when the page language is 'hi'. Strings the What-if page already has (header, tabs, footer) come from lib/whatif/i18n.js.
// STCG, LTCG, SEBI, AI, SID, KIM stay in Latin letters; digits stay Latin. Sentences with numbers live in copy.js.
export const EX_HI = {
  'Exit advisor': 'एग्ज़िट सलाहकार', 'Sell today,': 'आज बेचें,', 'or wait?': 'या रुकें?',
  'Tell us what you bought and when. We show what selling today costs, and what waiting saves.': 'बताइए आपने क्या ख़रीदा और कब। हम दिखाएँगे कि आज बेचने में कितना ख़र्च है और रुकने से कितनी बचत होती है।',
  'Your fund': 'आपका फ़ंड', 'Results update as you type.': 'टाइप करते ही नतीजे बदलते हैं।',
  'Fund type': 'फ़ंड का प्रकार', 'Equity fund': 'इक्विटी फ़ंड', 'Debt fund': 'डेट फ़ंड', 'Fund category': 'फ़ंड की श्रेणी',
  'Invested': 'निवेश किया', 'Worth today': 'आज का मूल्य', 'Quick invested amount': 'निवेश राशि जल्दी चुनें',
  'How long you have held it': 'कितने समय से रखा है', 'days': 'दिन', 'Days': 'दिन', 'or bought on': 'या ख़रीद की तारीख़',
  'Exit load (%)': 'एग्ज़िट लोड (%)',
  'Money elsewhere would earn (% a year)': 'दूसरी जगह पैसा सालाना कितना कमाएगा (%)',
  "Starts at SBI's 6.25% a year (deposits of 1 to under 2 years, since 15 Dec 2025). Use your own bank's current rate. Enter 0 to ignore it.": 'SBI की 6.25% सालाना दर से शुरू होता है (1 से 2 वर्ष से कम की जमा, 15 दिसंबर 2025 से)। अपने बैंक की मौजूदा दर डालें। इसे अनदेखा करने के लिए 0 डालें।',
  'The bottom line': 'कुल मिलाकर',
  'Income tax slab': 'इनकम टैक्स स्लैब', '5% slab': '5% स्लैब', '10% slab': '10% स्लैब', '15% slab': '15% स्लैब', '20% slab': '20% स्लैब', '25% slab': '25% स्लैब', '30% slab': '30% स्लैब',
  'ELSS units are locked in for 3 years and cannot be sold before then. Count from the allotment date on your statement.': 'ELSS यूनिट 3 साल के लॉक-इन में रहती हैं और उससे पहले बेची नहीं जा सकतीं। गिनती अपने स्टेटमेंट की अलॉटमेंट तारीख़ से करें।',
  'Get my exit advice': 'मेरी एग्ज़िट सलाह पाएँ',
  'Our call': 'हमारी सलाह',
  'Lock-in progress': 'लॉक-इन की प्रगति', 'ELSS units cannot be sold until the 3 years are over.': 'ELSS यूनिट 3 साल पूरे होने तक बेची नहीं जा सकतीं।',
  'Sample shape only. Your own amounts will draw the real chart.': 'यह सिर्फ़ नमूना आकार है। आपकी अपनी राशियाँ असली चार्ट बनाएँगी।',
  'What selling costs, by day': 'किस दिन बेचने पर कितना ख़र्च', "Tax plus exit load, if your fund's value stays flat.": 'टैक्स और एग्ज़िट लोड, अगर फ़ंड का मूल्य स्थिर रहे।',
  'Drag across the chart to try another day.': 'दूसरा दिन आज़माने के लिए चार्ट पर खींचें।',
  'Option A': 'विकल्प A', 'Option B': 'विकल्प B', 'Better pick': 'बेहतर चुनाव', 'Sell today': 'आज बेचें',
  'What it costs you': 'आपका ख़र्च', 'You keep': 'आपके हाथ में',
  'Explained in plain words': 'आसान शब्दों में', 'Based only on the numbers above.': 'सिर्फ़ ऊपर दिए आँकड़ों पर आधारित।',
  // New in the React version (not in the approved HTML page): please read these two Hindi lines.
  'AI is writing your explanation…': 'AI आपकी व्याख्या लिख रहा है…',
  'AI could not answer this time. This is a quick summary worked out from your numbers.': 'इस बार AI जवाब नहीं दे सका। यह आपके आँकड़ों से निकाला गया त्वरित सार है।',
  "Tax shown is before 4% cess and any surcharge. Tax rates are taken from published sources as of October 2026, not from the text of the Act, and the exit load is our assumption unless you enter your own. Before you act, confirm the rates on the Income Tax Department website (incometaxindia.gov.in) or with a tax professional, and your fund’s exit load in its SID or KIM.": 'यहाँ दिखाया टैक्स 4% सेस और किसी भी सरचार्ज से पहले का है। टैक्स की दरें अक्टूबर 2026 तक प्रकाशित स्रोतों से ली गई हैं, अधिनियम के मूल पाठ से नहीं, और जब तक आप अपना लोड न डालें, एग्ज़िट लोड हमारा अनुमान है। कदम उठाने से पहले दरें इनकम टैक्स विभाग की वेबसाइट (incometaxindia.gov.in) या किसी टैक्स विशेषज्ञ से, और अपने फ़ंड का एग्ज़िट लोड उसके SID या KIM में जाँच लें।',
};

export const CAT_HI = {
  'Equity: Flexi Cap / Large Cap': 'इक्विटी: फ्लेक्सी कैप / लार्ज कैप', 'Equity: Mid Cap / Small Cap': 'इक्विटी: मिड कैप / स्मॉल कैप',
  'Equity: Index / ETF': 'इक्विटी: इंडेक्स / ETF', 'Equity: ELSS (Tax Saver - 3yr lock)': 'इक्विटी: ELSS (टैक्स सेवर, 3 साल लॉक-इन)',
  'Equity: Sectoral / Thematic': 'इक्विटी: सेक्टोरल / थीमैटिक', 'Equity: General': 'इक्विटी: सामान्य',
  'Debt: Liquid / Ultra Short Duration': 'डेट: लिक्विड / अल्ट्रा शॉर्ट ड्यूरेशन', 'Debt: Money Market / Low Duration': 'डेट: मनी मार्केट / लो ड्यूरेशन',
  'Debt: Corporate Bond Fund': 'डेट: कॉर्पोरेट बॉन्ड फ़ंड', 'Debt: Banking & PSU Fund': 'डेट: बैंकिंग और PSU फ़ंड', 'Debt: General': 'डेट: सामान्य',
};
