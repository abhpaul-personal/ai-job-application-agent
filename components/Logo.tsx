export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#D97757" />
      <path
        d="M16 5 L18.3 13.7 L27 16 L18.3 18.3 L16 27 L13.7 18.3 L5 16 L13.7 13.7 Z"
        fill="#F5F0E8"
      />
    </svg>
  );
}
