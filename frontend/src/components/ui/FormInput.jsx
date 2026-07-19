import { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const FormInput = forwardRef(function FormInput(
  {
    label,
    error,
    className = '',
    id,
    type = 'text',
    showPasswordToggle = false,
    showPassword,
    onTogglePassword,
    as = 'input',
    options,
    ...props
  },
  ref
) {
  const inputId = id || props.name;
  const hasError = Boolean(error);

  const baseInputClasses = `
    w-full min-h-[52px] rounded-xl border-2 bg-white px-4 py-2.5 text-base text-forest
    placeholder:text-forest/40 transition-colors
    focus:outline-none focus:ring-2 disabled:opacity-50
    ${hasError
      ? 'border-error focus:border-error focus:ring-error/20'
      : 'border-forest/20 focus:border-accent focus:ring-accent/20'}
    ${showPasswordToggle ? 'pr-12' : ''}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-forest">
          {label}
        </label>
      )}

      <div className="relative">
        {as === 'select' ? (
          <select ref={ref} id={inputId} className={baseInputClasses} {...props}>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={baseInputClasses}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...props}
          />
        )}

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-forest/50 hover:text-forest"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      {hasError && (
        <p id={`${inputId}-error`} className="mt-1 text-sm font-medium text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default FormInput;
