const EmptyState = ({ icon = '📭', title = 'Nothing here', message = '' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
    <span className="text-5xl mb-4">{icon}</span>
    <h3 className="font-display text-2xl text-ice/40 tracking-wide">{title}</h3>
    {message && <p className="text-ice/25 text-sm mt-2 max-w-xs">{message}</p>}
  </div>
)

export default EmptyState
