import useExplainerText from '../../hooks/useExplainerText.js';
import { fmt1, fmtDate, fmtPts, isEstimated, sectorLabel, signOf } from '../../lib/explainer/format.js';

// The teal card: how each sector's weight difference added to or took away from the gap.
export default function AttributionCard({ data }) {
  const { L, lang } = useExplainerText();
  const r = data.result;
  const rows = [...r.sectors].sort((a, b) => Math.abs(b.effect_pts) - Math.abs(a.effect_pts));
  const maxEff = Math.max(...rows.map((s) => Math.abs(s.effect_pts)), 0.1);
  const noDrivers = !r.top_drivers || r.top_drivers.length === 0;
  const asOf = fmtDate(data.portfolio_as_of, lang);

  return (
    <section className="rx-panel rx-dark" aria-labelledby="rx-attr">
      <h3 id="rx-attr">
        {L("Where your fund's mix differed from its benchmark's", 'आपके फ़ंड का मिक्स बेंचमार्क से कहाँ अलग था')}
        <span className="rx-chip">{L('approximate', 'अनुमानित')}</span>
      </h3>
      <p className="rx-sub">
        {L(
          "The fund's weight in a sector compared with the benchmark's, times how that sector moved.",
          'किसी सेक्टर में फ़ंड का हिस्सा बेंचमार्क के हिस्से से कितना अलग था, गुणा उस सेक्टर की चाल।',
        )}
      </p>
      {noDrivers && (
        <p className="rx-note" role="status">
          {L(
            'No single sector made a big enough difference (0.5 points or more) to count as a main driver.',
            'किसी एक सेक्टर का अंतर इतना बड़ा (0.5 अंक या ज़्यादा) नहीं था कि उसे मुख्य कारण माना जाए।',
          )}
        </p>
      )}
      {rows.map((s) => {
        const sg = signOf(s.effect_pts);
        const width = `${Math.max(3, Math.round((Math.abs(s.effect_pts) / maxEff) * 100))}%`;
        return (
          <div className="rx-arow" key={s.sector}>
            <div>
              <b className="rx-nm">
                {sectorLabel(s.sector, lang)}
                {isEstimated(s.sector) && <span className="rx-chip">{L('estimated', 'अनुमानित')}</span>}
              </b>
              <small>
                {L('fund', 'फ़ंड')} {fmt1(s.fund_weight_pct)}% · {L('benchmark', 'बेंचमार्क')} {fmt1(s.benchmark_weight_pct)}%
              </small>
            </div>
            <div className="rx-track">
              <i style={{ width: sg === 0 ? '3%' : width, background: sg > 0 ? '#8CF2C0' : sg < 0 ? '#FFD3C9' : 'rgba(255,255,255,.4)' }} />
            </div>
            <span className={`v${sg > 0 ? ' rx-pos' : sg === 0 ? ' rx-zero' : ''}`}>{fmtPts(s.effect_pts, true, lang)}</span>
          </div>
        );
      })}
      <p className="rx-note">
        {L(
          `Sector mix explains ${fmtPts(r.explained_pts, false, lang)} of the ${fmtPts(r.gap_pts, false, lang)} gap; ${fmtPts(r.unexplained_pts, false, lang)} is left unexplained.`,
          `सेक्टर मिक्स से ${fmtPts(r.explained_pts, false, lang)} समझ आते हैं, कुल अंतर ${fmtPts(r.gap_pts, false, lang)} है; ${fmtPts(r.unexplained_pts, false, lang)} अनसमझा रहता है।`,
        )}
      </p>
      <p className="rx-note">
        {L(
          `Weights are the fund's holdings as on ${asOf}, applied to the whole period. This leaves out stock picking, changes in the weights during the period, cash and fees.`,
          `वेट फ़ंड के ${asOf} के होल्डिंग्स हैं और पूरी अवधि पर लगाए गए हैं। इसमें शेयरों का चुनाव, अवधि में वेट के बदलाव, नक़द और फ़ीस शामिल नहीं हैं।`,
        )}
      </p>
    </section>
  );
}
