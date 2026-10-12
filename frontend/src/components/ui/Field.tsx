export default function Field({ label, type, placeholder, value, onChange, rightLabel }) {
    return (<div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="block text-sm font-semibold text-on-surface-variant">{label}</label>
        {rightLabel}
      </div>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-[48px] bg-white border border-outline-variant rounded-xl px-6 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all"/>
    </div>);
}
