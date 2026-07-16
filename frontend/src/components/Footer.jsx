function Footer() {
  const bars = [1, 2, 1, 3, 1, 1, 2, 4, 1];

  return (
    <footer className="border-t-4 border-ink bg-bgBase text-ink py-6 px-8 font-mono text-xs uppercase font-bold">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <span className="text-lg tracking-tighter">ZENO_</span>
          <span className="border-l border-ink pl-4 text-inkMuted">
            © 2026 ZENO PLATFORM
          </span>
        </div>

        <div className="flex h-8 space-x-1 opacity-70">
          {bars.map((w, i) => (
            <div key={i} className={`bg-ink h-full`} style={{ width: `${w * 4}px` }} />
          ))}
        </div>

        <div className="text-inkMuted text-right">
          <div>SYS_ARCH // 2026</div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
