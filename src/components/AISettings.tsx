'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AI_MODEL } from '@/lib/aiMatch';
import { aiDownloaded, aiWanted, removeAI, setAIWanted } from '@/lib/receiptAI';

/** Settings → the on-device receipt AI: on/off, delete the downloaded model, and what model it is. */
export function AISettings() {
  const t = useTranslations('settings');
  const [state, setState] = useState<{ on: boolean; downloaded: boolean } | null>(null);

  const refresh = async () => setState({ on: aiWanted(), downloaded: await aiDownloaded() });
  useEffect(() => {
    let alive = true;
    aiDownloaded().then((downloaded) => alive && setState({ on: aiWanted(), downloaded }));
    return () => {
      alive = false;
    };
  }, []);

  if (!state) return <p className="m-0 text-[15px] text-muted">…</p>;
  return (
    <>
      <p className="m-0 text-[15px] text-muted">{t('aiLead')}</p>
      <p className="m-0 text-[15px] font-semibold">
        {state.on ? t('aiOn') : t('aiOff')} · {state.downloaded ? t('aiDownloaded', { mb: AI_MODEL.downloadMB }) : t('aiNotDownloaded')}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {state.on || state.downloaded ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await removeAI();
              await refresh();
            }}
          >
            {t('aiRemove')}
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setAIWanted(true);
              refresh();
            }}
          >
            {t('aiTurnOn')}
          </button>
        )}
      </div>
      <p className="m-0 text-xs text-muted">
        {t('aiModel', { model: AI_MODEL.id, version: AI_MODEL.revision.slice(0, 7), license: AI_MODEL.license })}
      </p>
    </>
  );
}
