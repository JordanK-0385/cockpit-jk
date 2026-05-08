import { AppShell } from '@/components/AppShell'
import { ColumnLeft } from '@/components/cockpit/ColumnLeft'
import { ColumnCenter } from '@/components/cockpit/ColumnCenter'
import { ColumnRight } from '@/components/cockpit/ColumnRight'

export function Cockpit() {
  return (
    <AppShell>
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: 'minmax(260px, 280px) 1fr minmax(300px, 320px)' }}
      >
        <ColumnLeft />
        <ColumnCenter />
        <ColumnRight />
      </div>
    </AppShell>
  )
}
