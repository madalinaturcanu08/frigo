/** Shown instantly while a page loads, so switching tabs never feels stuck. The nav stays in place. */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-[26px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <div className="h-4 w-28 rounded-full bg-track" />
          <div className="h-10 w-60 rounded-2xl bg-track" />
        </div>
        <div className="h-10 w-56 rounded-full bg-track" />
      </div>
      <div className="h-[230px] rounded-[30px] border-2 border-track bg-track/50" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[150px] rounded-[22px] border-2 border-track bg-card" />
        ))}
      </div>
    </div>
  );
}
