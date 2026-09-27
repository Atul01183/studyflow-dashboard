export default function ProgressBar({ value, color = 'blue' }) {
  return <div className="progress-track"><div className={`progress-fill ${color}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}
