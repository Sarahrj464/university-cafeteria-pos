import { Check, X } from 'lucide-react';
import { validatePasswordStrength } from '../../utils/validation';

const RULES = [
  { key: 'length', label: '8+ characters' },
  { key: 'uppercase', label: '1 uppercase' },
  { key: 'number', label: '1 number' },
  { key: 'special', label: '1 special character' },
];

const BAR_COLORS = {
  weak: 'bg-error',
  medium: 'bg-yellow-500',
  strong: 'bg-success',
};

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const { checks, strength, score } = validatePasswordStrength(password);
  const barWidth = `${(score / 4) * 100}%`;

  return (
    <div className="mt-2 space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-forest/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${BAR_COLORS[strength]}`}
          style={{ width: barWidth }}
        />
      </div>

      <ul className="grid grid-cols-2 gap-1">
        {RULES.map(({ key, label }) => {
          const passed = checks[key];
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 text-xs font-medium ${
                passed ? 'text-success' : 'text-forest/50'
              }`}
            >
              {passed ? <Check size={14} /> : <X size={14} className="text-error/60" />}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
