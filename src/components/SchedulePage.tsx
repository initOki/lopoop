import RaidSetup from '@/features/raidSetup/RaidSetup'

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">레이드 스케줄 관리</h1>
      <RaidSetup />
    </div>
  )
}
