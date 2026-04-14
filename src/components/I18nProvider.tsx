'use client'

import { ReactNode } from 'react'
import { I18nContext, useI18nState } from '@/lib/i18n'

export default function I18nProvider({ children }: { children: ReactNode }) {
  const value = useI18nState()

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}
