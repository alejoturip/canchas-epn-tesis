/**
 * MSym — ícono de Material Symbols Outlined.
 * Uso: <MSym name="event_available" className="text-pitch text-[20px]" />
 * `fill` activa la versión rellena del símbolo.
 */
export default function MSym({ name, className = '', fill = false, style, ...rest }) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? 'ms-fill' : ''} ${className}`}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}
