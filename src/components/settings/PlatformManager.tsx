import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { addPlatformAction, archivePlatformAction } from '@/app/actions/settings';

interface Platform {
  id: string;
  name: string;
  createdAt: string;
}

interface PlatformManagerProps {
  platforms: Platform[];
  isPending: boolean;
}

const PlatformManager: React.FC<PlatformManagerProps> = ({ platforms, isPending }) => {
  const [newPlatformName, setNewPlatformName] = useState('');
  const [platformError, setPlatformError] = useState<string | null>(null);

  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformError(null);
    if (!newPlatformName.trim()) return;
    try {
      await addPlatformAction({ name: newPlatformName });
      setNewPlatformName('');
    } catch (err: any) {
      setPlatformError(err.message);
    }
  };

  const handleArchivePlatform = async (id: string, name: string) => {
    if (confirm(`Are you sure you wish to archive platform "${name}"? Existing accounts using this platform will remain.`)) {
      try {
        await archivePlatformAction(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="text-gold-gradient" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          PLATFORM MANAGER
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Add, manage, and archive account platform directories.
        </p>
      </div>

      {platformError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '0.6rem 1rem',
            borderRadius: '4px',
            color: 'var(--color-danger)',
            fontSize: '0.8rem',
          }}
        >
          {platformError}
        </div>
      )}

      <form onSubmit={handleAddPlatform} style={{ display: 'flex', gap: '0.75rem', maxWidth: '460px' }}>
        <input
          type="text"
          required
          placeholder="e.g. Gumtree"
          value={newPlatformName}
          onChange={(e) => setNewPlatformName(e.target.value)}
          className="input-gold"
          style={{ flex: 1, height: '42px' }}
          disabled={isPending}
        />
        <button type="submit" className="btn-gold" style={{ height: '42px' }} disabled={isPending}>
          <Plus size={16} />
          <span>Add</span>
        </button>
      </form>

      <div className="table-container-outer" style={{ maxWidth: '550px', marginTop: '1rem' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Platform Name</th>
              <th>Created At</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {platforms.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                  No platforms configured.
                </td>
              </tr>
            ) : (
              platforms.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name.toUpperCase()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleArchivePlatform(p.id, p.name)}
                      className="btn-danger"
                      style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
                      title="Archive Platform"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlatformManager;
