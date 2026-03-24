"use client";

type NewsTickerProps = {
  items: string[];
};

export default function NewsTicker({ items }: NewsTickerProps) {
  if (items.length === 0) return null;

  const looped = [...items, ...items];

  return (
    <div className="bg-[#0f0f0f] text-[#f8f6f1] border-y border-[#c8102e]/50 overflow-hidden">
      <div className="ticker-track py-2 whitespace-nowrap">
        {looped.map((item, index) => (
          <span key={`${item}-${index}`} className="mx-6 text-sm md:text-base">
            <span className="text-[#c8102e] font-bold mr-2">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
