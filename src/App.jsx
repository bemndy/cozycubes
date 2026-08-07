import Timer from './components/Timer.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center gap-4">
      <h1 className="text-lg font-semibold tracking-wide text-neutral-400">CozyCubes</h1>
      <Timer />
    </div>
  )
}
