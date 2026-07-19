const variants = {
  default: 'bg-forest/10 text-forest',
  accent: 'bg-orange/15 text-orange',
  success: 'bg-forest/10 text-forest',
  warning: 'bg-alert-orange/15 text-alert-orange',
  danger: 'bg-alert-orange/15 text-alert-orange',
};



export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold
        uppercase tracking-wide ${variants[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
}
