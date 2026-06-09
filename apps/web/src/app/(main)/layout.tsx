import { ConditionalShell } from './ConditionalShell'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <ConditionalShell>{children}</ConditionalShell>
}
