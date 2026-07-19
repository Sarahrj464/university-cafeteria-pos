const variants = {
  primary: 'bg-forest text-cream hover:bg-forest/90 active:bg-forest/90',
  accent: 'bg-accent text-cream hover:bg-accent/90 active:bg-accent/90',
  outline: 'border-2 border-forest/20 text-forest hover:bg-forest/5 hover:text-forest',
  ghost: 'text-forest hover:bg-forest/10 hover:text-forest',
  danger: 'bg-error text-cream hover:bg-error/90 active:bg-error/90',
};


const sizes = {
  sm: 'px-4 py-2 text-sm min-h-[48px]',
  md: 'px-6 py-3 text-base min-h-touch',
  lg: 'px-8 py-4 text-lg min-h-[72px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-colors duration-200 touch-target
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
