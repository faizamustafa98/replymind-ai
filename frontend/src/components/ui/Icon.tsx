export default function Icon({ name, className = "", filled = false }) {
    return (<span className={`material-symbols-outlined ${filled ? "msym-fill" : ""} ${className}`}>
      {name}
    </span>);
}
