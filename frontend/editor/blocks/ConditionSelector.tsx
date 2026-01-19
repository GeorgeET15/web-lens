import { useState } from 'react';
import { ElementPicker } from '../../components/ElementPicker';
import { VariableInput } from '../../components/VariableInput';
import { ElementRef } from '../../types/element';

export interface Condition {
  kind: 'element_visible' | 'element_not_visible' | 'page_title_equals' | 'url_contains' | 'saved_value_exists' | 'saved_value_equals' | 'text_match';
  element?: ElementRef;
  expected_title?: string;
  expected_fragment?: string;
  value_ref?: { key: string; label: string };
  expected_text?: string;
  match_mode?: 'equals' | 'contains';
  value?: string;
}

interface ConditionSelectorProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRequestPick?: (blockType: string, callback: (element: ElementRef) => void) => void;
  savedValues?: { key: string; label: string }[];
}

export function ConditionSelector({ condition, onChange, onRequestPick, savedValues = [] }: ConditionSelectorProps) {
  const [isPicking, setIsPicking] = useState(false);
  
  const handleChange = (field: keyof Condition, value: string | ElementRef | { key: string, label: string } | undefined) => {
    onChange({ ...condition, [field]: value } as Condition);
  };

  const handleStartPicking = () => {
    if (onRequestPick) {
      setIsPicking(true);
      onRequestPick(`condition_${condition.kind}`, (element) => {
        handleChange('element', element);
        setIsPicking(false);
      });
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">Condition Type</label>
        <select
          value={condition.kind}
          onChange={(e) => {
            const newKind = e.target.value as Condition['kind'];
            // Reset params based on kind
            const newCondition: Condition = { kind: newKind };
            if (newKind.startsWith('element_') || newKind === 'text_match') newCondition.element = undefined;
            if (newKind === 'page_title_equals') newCondition.expected_title = '';
            if (newKind === 'url_contains') newCondition.expected_fragment = '';
            if (newKind === 'text_match') {
                newCondition.match_mode = 'equals';
                newCondition.value = '';
            }
            if (newKind.startsWith('saved_value_')) {
               newCondition.value_ref = { key: '', label: '' };
               if (newKind === 'saved_value_equals') newCondition.expected_text = '';
            }
            onChange(newCondition);
          }}
          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-blue-700 focus:outline-none"
        >
          <optgroup label="Element State">
            <option value="element_visible">Element is visible</option>
            <option value="element_not_visible">Element is not visible</option>
            <option value="text_match">Element text match</option>
          </optgroup>
          <optgroup label="Page State">
            <option value="page_title_equals">Page title equals</option>
            <option value="url_contains">URL contains</option>
          </optgroup>
          <optgroup label="Data State">
            <option value="saved_value_exists">Saved value exists</option>
            <option value="saved_value_equals">Saved value equals</option>
          </optgroup>
        </select>
      </div>

      {/* Element Conditions */}
      {(condition.kind === 'element_visible' || condition.kind === 'element_not_visible' || condition.kind === 'text_match') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400">Target Element</label>
          <ElementPicker
            value={condition.element}
            isPicking={isPicking}
            onStartPicking={handleStartPicking}
            onStopPicking={() => setIsPicking(false)}
            onChange={(el) => handleChange('element', el)}
          />
        </div>
      )}

      {/* Text Match Details */}
      {condition.kind === 'text_match' && (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">Mode</label>
                <select
                    value={condition.match_mode || 'equals'}
                    onChange={(e) => handleChange('match_mode', (e.target.value as 'equals' | 'contains'))}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-blue-700 focus:outline-none"
                >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">Value</label>
                <VariableInput
                    value={condition.value || ''}
                    onChange={(val) => handleChange('value', val)}
                    savedValues={savedValues}
                    placeholder="Expected text..."
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-blue-700 focus:outline-none"
                />
              </div>
          </div>
      )}

      {/* Page Title Condition */}
      {condition.kind === 'page_title_equals' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400">Expected Title</label>
          <VariableInput
            value={condition.expected_title || ''}
            onChange={(val) => handleChange('expected_title', val)}
            savedValues={savedValues}
            placeholder="e.g. Dashboard - Acme Corp"
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-blue-700 focus:outline-none"
          />
        </div>
      )}

      {/* URL Condition */}
      {condition.kind === 'url_contains' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400">URL Fragment</label>
          <VariableInput
            value={condition.expected_fragment || ''}
            onChange={(val) => handleChange('expected_fragment', val)}
            savedValues={savedValues}
            placeholder="e.g. /checkout/success"
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-blue-700 focus:outline-none"
          />
        </div>
      )}

      {/* Saved Value Conditions */}
      {(condition.kind === 'saved_value_exists' || condition.kind === 'saved_value_equals') && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400">Saved Value</label>
            <select
              value={condition.value_ref?.key || ''}
              onChange={(e) => {
                const key = e.target.value;
                const label = savedValues.find(v => v.key === key)?.label || key;
                handleChange('value_ref', { key, label });
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-blue-700 focus:outline-none"
            >
              <option value="">Select a value...</option>
              {savedValues.map((sv) => (
                <option key={sv.key} value={sv.key}>
                  {sv.label}
                </option>
              ))}
            </select>
          </div>

          {condition.kind === 'saved_value_equals' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-400">Expected Text</label>
              <VariableInput
                value={condition.expected_text || ''}
                onChange={(val) => handleChange('expected_text', val)}
                savedValues={savedValues}
                placeholder="Exact text match"
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-blue-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
