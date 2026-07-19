import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { calcUnitPrice } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/currency';

export default function ModifierSheet({ item, isOpen, onClose, onAdd }) {
  const [selections, setSelections] = useState({});

  useEffect(() => {
    if (!item || !isOpen) return;
    const initial = {};
    (item.modifiers || []).forEach((group) => {
      if (group.required && group.options?.length) {
        initial[group.id] = group.multiSelect ? [group.options[0].id] : group.options[0].id;
      } else if (group.multiSelect) {
        initial[group.id] = [];
      }
    });
    setSelections(initial);
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const groups = item.modifiers || [];

  const buildSelectedModifiers = () => {
    const result = [];
    groups.forEach((group) => {
      const sel = selections[group.id];
      if (!sel) return;
      const ids = group.multiSelect ? sel : [sel];
      ids.forEach((optionId) => {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceAdjustment: option.priceAdjustment || 0,
          });
        }
      });
    });
    return result;
  };

  const selectedMods = buildSelectedModifiers();
  const unitPrice = calcUnitPrice(item.price, selectedMods);

  const isValid = groups.every((group) => {
    if (!group.required) return true;
    const sel = selections[group.id];
    return group.multiSelect ? sel?.length > 0 : Boolean(sel);
  });

  const handleSingleSelect = (groupId, optionId) => {
    setSelections((prev) => ({ ...prev, [groupId]: optionId }));
  };

  const handleMultiSelect = (groupId, optionId) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  };

  const handleAdd = () => {
    onAdd(item, selectedMods);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-forest/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-2xl bg-cream p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-forest">{item.name}</h3>
            <p className="text-sm text-forest/60">Customize your order</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-forest hover:bg-forest/10"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-sm font-semibold text-forest">
                {group.name}
                {group.required && <span className="text-error"> *</span>}
              </p>
              <div className="space-y-2">
                {group.options.map((option) => {
                  const isSelected = group.multiSelect
                    ? (selections[group.id] || []).includes(option.id)
                    : selections[group.id] === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        group.multiSelect
                          ? handleMultiSelect(group.id, option.id)
                          : handleSingleSelect(group.id, option.id)
                      }
                      className={`flex w-full min-h-[52px] items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent/10'
                          : 'border-forest/15 bg-white hover:border-forest/30'
                      }`}
                    >
                      <span className="font-medium text-forest">{option.name}</span>
                      {option.priceAdjustment > 0 && (
                        <span className="text-sm font-semibold text-accent">
                          +{formatCurrency(option.priceAdjustment)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-forest/10 pt-4">
          <div>
            <p className="text-sm text-forest/60">Total</p>
            <p className="text-2xl font-bold text-accent">{formatCurrency(unitPrice)}</p>
          </div>
          <Button
            variant="accent"
            size="md"
            disabled={!isValid}
            onClick={handleAdd}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}


