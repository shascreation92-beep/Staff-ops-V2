import React, { useState, ChangeEvent, FormEvent, useTransition } from 'react';
import { useRules } from '@/hooks/useRules';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Sliders, HelpCircle } from 'lucide-react';

// Zod schema for rule form (mirrors server)
const RuleFormSchema = z.object({
  minAds: z.string().or(z.number()),
  requireVerification: z.enum(['true', 'false']),
  targetToMaintain: z.string().or(z.number()),
  targetToMaintainFB: z.string().or(z.number()),
});

type RuleFormValues = {
  minAds: number;
  requireVerification: 'true' | 'false';
  targetToMaintain: number;
  targetToMaintainFB: number;
};

export const RuleForm: React.FC<{
  currentUserRole: string;
  companies: { id: string; name: string }[];
  initialValues: RuleFormValues;
  targetCompanyId?: string;
}> = ({ currentUserRole, companies, initialValues, targetCompanyId }) => {
  const [isPending, startTransition] = useTransition();
  const { mutateAsync: updateRule, isLoading } = useRules();
  const [form, setForm] = useState<RuleFormValues>(initialValues);
  const [activeCompany, setActiveCompany] = useState<string>(targetCompanyId || (companies[0]?.id ?? ''));

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes('target') ? Number(value) : value
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payloads = [
          { key: 'minAds', value: String(form.minAds) },
          { key: 'requireVerification', value: form.requireVerification },
          { key: 'targetToMaintain', value: String(form.targetToMaintain) },
          { key: 'targetToMaintainFB', value: String(form.targetToMaintainFB) },
        ];
        for (const p of payloads) {
          await updateRule({ ...p, targetCompanyId: currentUserRole === 'SUPER_ADMIN' ? activeCompany : undefined });
        }
        toast.success('Threshold rules synchronized successfully.');
      } catch (err: any) {
        toast.error(err.message || 'Failed to update rules');
      }
    });
  };

  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      {isSuperAdmin && (
        <div className="form-group">
          <label className="block text-sm font-medium text-gray-200 mb-1">Active Shard Target Company</label>
          <select
            value={activeCompany}
            onChange={e => setActiveCompany(e.target.value)}
            className="w-full rounded-md bg-gray-800 border border-gray-600 text-gray-100 p-2"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="flex items-center gap-1 text-sm font-medium text-gray-200 mb-1">
          Minimum Ads Required
          <HelpCircle size={14} className="text-gray-400" />
        </label>
        <input
          type="number"
          name="minAds"
          min={0}
          value={form.minAds}
          onChange={handleChange}
          className="input-gold"
          disabled={isPending}
        />
      </div>

      <div className="form-group">
        <label className="block text-sm font-medium text-gray-200 mb-1">Require Document Verification</label>
        <select
          name="requireVerification"
          value={form.requireVerification}
          onChange={handleChange}
          className="select-gold"
          disabled={isPending}
        >
          <option value="true">Yes (Flag unverified accounts red)</option>
          <option value="false">No (Accept unverified accounts)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="flex items-center gap-1 text-sm font-medium text-gray-200 mb-1">
          Global Target to Maintain
          <HelpCircle size={14} className="text-gray-400" />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-glass w-10 h-10"
            disabled={isPending || form.targetToMaintain <= 0}
            onClick={() => setForm(prev => ({ ...prev, targetToMaintain: Math.max(0, prev.targetToMaintain - 1) }))}
          >
            &minus;
          </button>
          <span className="flex-1 text-center text-xl font-bold text-gold-primary">
            {form.targetToMaintain}
          </span>
          <button
            type="button"
            className="btn-gold w-10 h-10"
            disabled={isPending || form.targetToMaintain >= 50}
            onClick={() => setForm(prev => ({ ...prev, targetToMaintain: Math.min(50, prev.targetToMaintain + 1) }))}
          >
            +
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="flex items-center gap-1 text-sm font-medium text-gray-200 mb-1">
          FB Target to Maintain
          <HelpCircle size={14} className="text-gray-400" />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-glass w-10 h-10"
            disabled={isPending || form.targetToMaintainFB <= 0}
            onClick={() => setForm(prev => ({ ...prev, targetToMaintainFB: Math.max(0, prev.targetToMaintainFB - 1) }))}
          >
            &minus;
          </button>
          <span className="flex-1 text-center text-xl font-bold text-gold-primary">
            {form.targetToMaintainFB}
          </span>
          <button
            type="button"
            className="btn-gold w-10 h-10"
            disabled={isPending || form.targetToMaintainFB >= 50}
            onClick={() => setForm(prev => ({ ...prev, targetToMaintainFB: Math.min(50, prev.targetToMaintainFB + 1) }))}
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn-gold w-full h-10"
        disabled={isPending}
      >
        {isPending ? 'Syncing Rules...' : 'SYNC RULES'}
      </button>
    </form>
  );
};
