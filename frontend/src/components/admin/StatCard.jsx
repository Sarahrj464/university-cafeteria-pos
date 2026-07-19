import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

const colorMap = {
  forest: {
    border: 'border-l-forest',
    iconBg: 'bg-forest/10',
    iconText: 'text-forest',
  },
  accent: {
    border: 'border-l-accent',
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
  },
  success: {
    border: 'border-l-success',
    iconBg: 'bg-success/10',
    iconText: 'text-success',
  },
  error: {
    border: 'border-l-error',
    iconBg: 'bg-error/10',
    iconText: 'text-error',
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'forest',
  trendText,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral'
  urgent = false,
}) {
  const c = colorMap[color] || colorMap.forest;

  return (
    <div
      className={`
        rounded-2xl border-2 border-l-4 bg-white p-5 shadow-sm
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${c.border}
        ${urgent ? 'border-error/30 bg-error/5' : 'border-forest/10'}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-forest/60">{label}</p>
          <p className="mt-1 text-3xl font-bold text-forest">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-xl p-2.5 ${urgent ? 'bg-error/15' : c.iconBg}`}>
            <Icon size={22} className={urgent ? 'text-error' : c.iconText} />
          </div>
        )}
      </div>

      {trendText && (
        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium">
          {trendType === 'positive' && <TrendingUp size={14} className="text-success" />}
          {trendType === 'negative' && <AlertTriangle size={14} className="text-error" />}
          {trendType === 'neutral' && <CheckCircle2 size={14} className="text-forest/50" />}
          <span
            className={
              trendType === 'positive'
                ? 'text-success'
                : trendType === 'negative'
                ? 'text-error'
                : 'text-forest/60'
            }
          >
            {trendText}
          </span>
        </div>
      )}
    </div>
  );
}