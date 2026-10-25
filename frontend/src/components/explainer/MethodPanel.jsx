import useExplainerText from '../../hooks/useExplainerText.js';
import { fmtDate, sectorLabel } from '../../lib/explainer/format.js';

// A closed-by-default panel that lists where every number came from.
export default function MethodPanel({ data }) {
  const { L, lang } = useExplainerText();
  const sources = Array.isArray(data.data_sources) ? data.data_sources : [];
  const indexes = Object.entries(data.index_used || {});
  return (
    <details className="rx-method">
      <summary>{L('How we got these numbers', 'ये आँकड़े कहाँ से आए')}</summary>
      <div className="rx-mbody">
        <div>
          <h4>{L('Data sources', 'डेटा के स्रोत')}</h4>
          <ul>
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                {' '}({L('read on', 'देखा गया')} {fmtDate(s.accessed_on, lang)})
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{L('Index used for each sector', 'हर सेक्टर के लिए इस्तेमाल इंडेक्स')}</h4>
          <ul>
            {indexes.map(([sector, name]) => (
              <li key={sector}><b>{sectorLabel(sector, lang)}:</b> {name}</li>
            ))}
          </ul>
        </div>
        {data.notes && (
          <div>
            <h4>{L('Notes on the data', 'डेटा पर टिप्पणियाँ')}</h4>
            <p>{data.notes}</p>
          </div>
        )}
        <p>
          {L(
            `Data as on ${fmtDate(data.as_of, lang)}. Sector returns are total returns (dividends included), the same basis as the fund and benchmark returns.`,
            `डेटा ${fmtDate(data.as_of, lang)} तक का है। सेक्टर रिटर्न टोटल रिटर्न हैं (लाभांश शामिल), वही आधार जो फ़ंड और बेंचमार्क रिटर्न का है।`,
          )}
        </p>
      </div>
    </details>
  );
}
