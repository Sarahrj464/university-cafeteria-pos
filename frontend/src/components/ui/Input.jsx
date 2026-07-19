import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, className = '', id, ...props },
  ref
) {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-base font-medium text-forest"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full min-h-touch rounded-xl border-2 border-forest/20 bg-white
          px-4 py-3 text-lg text-forest placeholder:text-forest/40
          transition-colors focus:border-accent focus:outline-none focus:ring-2
          focus:ring-accent/30 disabled:opacity-50
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
