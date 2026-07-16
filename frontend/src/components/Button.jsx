function Button({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="
        border
        border-black
        px-6
        py-3
        uppercase
        font-mono
        tracking-widest
        hover:bg-[var(--highlight)]
        transition-colors
      "
    >
      {children}
    </button>
  );
}

export default Button;