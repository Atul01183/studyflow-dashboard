import { STATUS_OPTIONS } from '../data/syllabus';
export default function StatusSelect({ value, onChange }) {
  return <select className={`status ${value.toLowerCase().replace(' ', '-')}`} value={value} onChange={e => onChange(e.target.value)}>
    {STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}
  </select>;
}
