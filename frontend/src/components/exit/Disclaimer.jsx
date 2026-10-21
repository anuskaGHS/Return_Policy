import useExitText from '../../hooks/useExitText.js';
import { WarnIcon } from './icons.jsx';

export default function Disclaimer() {
  const { t } = useExitText();
  return (
    <div className="ex-disc">
      <WarnIcon />
      <p>{t('Tax shown is before 4% cess and any surcharge. Tax rates are taken from published sources as of October 2026, not from the text of the Act, and the exit load is our assumption unless you enter your own. Before you act, confirm the rates on the Income Tax Department website (incometaxindia.gov.in) or with a tax professional, and your fund’s exit load in its SID or KIM.')}</p>
    </div>
  );
}
