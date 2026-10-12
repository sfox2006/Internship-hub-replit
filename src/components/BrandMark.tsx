/** Text/CSS reconstruction from the supplied screenshot, not an official logo asset. */
export default function BrandMark() {
  return (
    <span
      className="cis-brand-mark"
      role="img"
      aria-label="Centre for Independent Studies — 50 years of impact"
    >
      <span className="cis-plaque" aria-hidden="true">
        <span>THE CENTRE FOR</span>
        <strong>INDEPENDENT</strong>
        <span>STUDIES</span>
      </span>
      <span className="cis-anniversary" aria-hidden="true">
        <strong>50</strong>
        <em>years</em>
        <span>OF IMPACT</span>
      </span>
    </span>
  );
}
