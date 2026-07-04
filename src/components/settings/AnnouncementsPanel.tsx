import React, { useState } from 'react';
import { createAnnouncementAction } from '@/app/actions/settings';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  company?: { name: string } | null;
}

interface Company {
  id: string;
  name: string;
}

interface AnnouncementsPanelProps {
  announcements: Announcement[];
  companies: Company[];
  isPending: boolean;
}

const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ announcements, companies, isPending }) => {
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annTargetCompany, setAnnTargetCompany] = useState('');
  const [annSender, setAnnSender] = useState<'COMPANY_HQ' | 'IT_DEPARTMENT'>('COMPANY_HQ');
  const [annType, setAnnType] = useState<'COMPANY_UPDATE' | 'URGENT_ALERT' | 'SALES_CELEBRATION'>('COMPANY_UPDATE');
  const [annError, setAnnError] = useState<string | null>(null);
  const [annSuccessMsg, setAnnSuccessMsg] = useState<string | null>(null);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError(null);
    setAnnSuccessMsg(null);
    try {
      await createAnnouncementAction({
        title: annTitle,
        content: annContent,
        targetCompanyId: annTargetCompany === '' ? undefined : annTargetCompany,
        sender: annSender,
        type: annType,
      });
      setAnnTitle('');
      setAnnContent('');
      setAnnTargetCompany('');
      setAnnSender('COMPANY_HQ');
      setAnnType('COMPANY_UPDATE');
      setAnnSuccessMsg('System announcement successfully distributed to target nodes.');
      setTimeout(() => setAnnSuccessMsg(null), 3000);
    } catch (err: any) {
      setAnnError(err.message || 'Failed to publish announcement.');
    }
  };

  const parseAnnTitle = (rawTitle: string) => {
    try {
      const parsed = JSON.parse(rawTitle);
      if (parsed && typeof parsed === 'object' && 'sender' in parsed) {
        return parsed as { sender: string; type: string; text: string };
      }
    } catch (e) {}
    return { sender: 'COMPANY_HQ', type: 'COMPANY_UPDATE', text: rawTitle };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 className="text-gold-gradient" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          BROADCAST SYSTEM ANNOUNCEMENT
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Send messages and alerts to company dashboard banners.
        </p>
      </div>

      {annSuccessMsg && (
        <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.6rem 1rem', borderRadius: '4px', color: 'var(--color-success)', fontSize: '0.85rem' }}>
          {annSuccessMsg}
        </div>
      )}

      {annError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.6rem 1rem', borderRadius: '4px', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
          {annError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        {/* Dispatcher Form */}
        <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Recipient Scope</label>
            <select
              value={annTargetCompany}
              onChange={(e) => setAnnTargetCompany(e.target.value)}
              className="select-gold"
              disabled={isPending}
            >
              <option value="">Global Broadcast (All Companies)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Sender Identity</label>
              <select
                value={annSender}
                onChange={(e) => setAnnSender(e.target.value as any)}
                className="select-gold"
                disabled={isPending}
              >
                <option value="COMPANY_HQ">🏢 Company HQ</option>
                <option value="IT_DEPARTMENT">💻 IT Department</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Type</label>
              <select
                value={annType}
                onChange={(e) => setAnnType(e.target.value as any)}
                className="select-gold"
                disabled={isPending}
              >
                <option value="COMPANY_UPDATE">🏢 [Company Update]</option>
                <option value="URGENT_ALERT">⚠️ [Urgent Alert]</option>
                <option value="SALES_CELEBRATION">🎉 [Sales Celebration]</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Announcement Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Critical Shard Database Maintenance"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="input-gold"
              disabled={isPending}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Announcement Content</label>
            <textarea
              rows={4}
              required
              placeholder="Enter broadcast details, links or schedules..."
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              className="input-gold"
              style={{ resize: 'none' }}
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            className="btn-gold"
            style={{ width: '100%', height: '42px', marginTop: '0.5rem' }}
            disabled={isPending}
          >
            {isPending ? 'Broadcasting...' : 'DISPATCH BROADCAST'}
          </button>
        </form>

        {/* History list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem' }}>
            Announcement Archive
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
            {announcements.length === 0 ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No broadcasts recorded.</span>
            ) : (
              announcements.map((ann) => {
                const parsed = parseAnnTitle(ann.title);
                
                // Get type styles and badges
                let typeColor = 'var(--gold-primary)';
                let typeLabel = '[Company Update]';
                if (parsed.type === 'URGENT_ALERT') {
                  typeColor = '#EF4444';
                  typeLabel = '[Urgent Alert]';
                } else if (parsed.type === 'SALES_CELEBRATION') {
                  typeColor = '#10B981';
                  typeLabel = '[Sales Celebration]';
                }

                const senderDisplay = parsed.sender === 'COMPANY_HQ' ? '🏢 Company HQ' : '💻 IT Department';

                return (
                  <div key={ann.id} style={{ padding: '0.75rem', border: '1px solid var(--border-gold)', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.62rem', background: 'rgba(2, 80, 161, 0.05)', color: '#0250A1', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 800 }}>
                        {senderDisplay}
                      </span>
                      <span style={{ fontSize: '0.62rem', background: 'rgba(0,0,0,0.03)', color: typeColor, padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 800 }}>
                        {typeLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{parsed.text}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{ann.content}</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                      Sent: {new Date(ann.createdAt).toLocaleDateString()} | Scope: {ann.company?.name || 'Global'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPanel;
