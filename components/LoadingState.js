export default function LoadingState({ label = "Loading..." }) {
  return (
    <main className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="card flex items-center gap-3 rounded-xl px-5 py-4">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" />
        <p className="text-sm font-medium text-orange-900">{label}</p>
      </div>
    </main>
  );
}

