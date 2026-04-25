export default function CoinIcon({ size = 16, className = '' }) {
  return (
    <img
      src="/piecenora.png"
      alt="pièces"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
