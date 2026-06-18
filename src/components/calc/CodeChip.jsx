import { fmtUSD } from '../../utils/calcConfig';

// A single selectable billing-code card with an optional unit stepper.
// Presentational only — all rate resolution is done by the parent.
export default function CodeChip({
  codeKey, label, cpt, payer, qty, rate, covered, billingMode,
  maxUnits, onAdd, onRemove, onQty,
}) {
  const selected = qty > 0;
  const hasStepper = maxUnits > 1;

  let rateBadge = <span className="cc-rate cc-rate-muted">—</span>;
  if (payer) {
    if (billingMode === 'flat') rateBadge = <span className="cc-rate cc-rate-muted">Incl.</span>;
    else if (billingMode === 'special') rateBadge = <span className="cc-rate cc-rate-muted">$0</span>;
    else if (covered) rateBadge = <span className="cc-rate cc-rate-green">{fmtUSD(rate)}</span>;
    else rateBadge = <span className="cc-rate cc-rate-red">N/C</span>;
  }

  return (
    <div className={`code-chip-card${selected ? ' active' : ''}${payer && billingMode === 'perCode' && !covered ? ' not-covered' : ''}`}>
      <div className="code-chip-head">
        <div className="code-chip-title">
          <span className="code-chip-key">{codeKey}</span>
          <span className="code-chip-cpt">{cpt}</span>
        </div>
        {rateBadge}
      </div>
      <div className="code-chip-desc">{label}</div>

      {selected ? (
        <div className="code-chip-actions">
          {hasStepper ? (
            <div className="code-chip-stepper">
              <button
                type="button"
                aria-label={`Decrease ${codeKey} units`}
                onClick={() => onQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
              >−</button>
              <span className="code-chip-qty">{qty}u</span>
              <button
                type="button"
                aria-label={`Increase ${codeKey} units`}
                onClick={() => onQty(Math.min(maxUnits, qty + 1))}
                disabled={qty >= maxUnits}
              >+</button>
            </div>
          ) : (
            <span className="code-chip-selected-label">Selected</span>
          )}
          <button type="button" className="code-chip-remove" onClick={onRemove}>× Remove</button>
        </div>
      ) : (
        <button
          type="button"
          className="code-chip-add"
          onClick={onAdd}
          disabled={!payer}
        >
          + Add
        </button>
      )}
    </div>
  );
}
