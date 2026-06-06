const Spinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-[3px]',
  }
  return (
    <div
      className={`${sizes[size]} rounded-full border-white/10 border-t-pitch animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )
}

export default Spinner
