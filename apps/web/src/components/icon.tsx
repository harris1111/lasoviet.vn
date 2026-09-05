type IconName =
  | "arrow-right"
  | "calendar-day"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "clock"
  | "close"
  | "elements"
  | "hash"
  | "help-circle"
  | "map-pin"
  | "menu"
  | "orbit"
  | "refresh-off"
  | "shield-lock"
  | "star"
  | "trien";

const paths: Record<IconName, React.ReactNode> = {
  "arrow-right": <path d="M3.5 12h17M13.5 5l7 7-7 7" />,
  "calendar-day": <><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M8.5 3.5v4M15.5 3.5v4M4 10.5h16M11.4 14.8h1.4" /></>,
  check: <path d="M4 12.8l5.2 5.2L20 6.4" />,
  "chevron-down": <path d="M5.5 9l6.5 6.5L18.5 9" />,
  "chevron-right": <path d="M9 5.5l6.5 6.5L9 18.5" />,
  clock: <><circle cx="12" cy="12" r="8.2" /><path d="M12 7.4v5l3.2 2.1" /></>,
  close: <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />,
  elements: <><circle cx="12" cy="4.2" r="1.5" /><circle cx="19" cy="9.2" r="1.5" /><circle cx="16.3" cy="17.5" r="1.5" /><circle cx="7.7" cy="17.5" r="1.5" /><circle cx="5" cy="9.2" r="1.5" /><path d="M12 5.7L18 9.3M17.9 10.6l-1.7 6M15.7 17.5H8.3M7.4 16.6l-1.7-6M6 9.3L11.6 5.6" /></>,
  hash: <path d="M9.5 3.5l-3 17M17.5 3.5l-3 17M4 9h16M3.2 15h16" />,
  "help-circle": <><circle cx="12" cy="12" r="8.2" /><path d="M9.7 9.6a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .9-1 1.6v.3M12 16.8h.01" /></>,
  "map-pin": <><path d="M12 20.8s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="9.8" r="2.5" /></>,
  menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
  orbit: <><circle cx="12" cy="12" r="2.1" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-28 12 12)" /><circle cx="20.1" cy="7.7" r="1.1" fill="currentColor" stroke="none" /></>,
  "refresh-off": <><path d="M18.9 8.2A8 8 0 1 0 19.6 14M19.4 3.6v4.8h-4.8M6.5 17.5L17.5 6.5" /></>,
  "shield-lock": <><path d="M12 3l7.5 3v5.6c0 4.4-3.2 7.1-7.5 8.4-4.3-1.3-7.5-4-7.5-8.4V6L12 3z" /><path d="M10 12.6h4v3h-4zM10.9 12.6v-1.2a1.1 1.1 0 0 1 2.2 0v1.2" /></>,
  star: <path d="M12 3.5c0 4-1 6.5-4.5 8.5 3.5 2 4.5 4.5 4.5 8.5 0-4 1-6.5 4.5-8.5-3.5-2-4.5-4.5-4.5-8.5z" />,
  trien: <><rect x="2.8" y="2.8" width="18.4" height="18.4" rx="1" /><rect x="6.6" y="6.6" width="10.8" height="10.8" rx=".5" /></>,
};

export function Icon({ name, title }: { name: IconName; title?: string }) {
  return (
    <svg aria-hidden={title === undefined} className="icon" viewBox="0 0 24 24" focusable="false">
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
