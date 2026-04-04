export function Tabs<T extends string>({
  items,
  activeItem,
  onChange,
}: {
  items: readonly T[]
  activeItem: T
  onChange: (item: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`rounded-2xl px-4 py-2 text-base font-semibold transition ${
            activeItem === item ? 'bg-warm-700 text-white' : 'bg-white text-warm-800 hover:bg-warm-100'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
