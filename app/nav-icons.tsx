type NavIconProps = {
  active?: boolean;
};

const iconClass = "shrink-0";

function stroke(active?: boolean) {
  return active ? "rgb(255 255 255)" : "rgb(169 164 152)";
}

export function IconDashboard({ active }: NavIconProps) {
  const s = stroke(active);
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      className={iconClass}
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAccounts({ active }: NavIconProps) {
  const s = stroke(active);
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      className={iconClass}
      aria-hidden
    >
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="3"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 10h19"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBudgets({ active }: NavIconProps) {
  const s = stroke(active);
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      className={iconClass}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12V3"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12l7.5 5"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconReports({ active }: NavIconProps) {
  const s = stroke(active);
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      className={iconClass}
      aria-hidden
    >
      <path
        d="M4 20h16"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 20v-7"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 20V5"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 20v-10"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSettings({ active }: NavIconProps) {
  const s = stroke(active);
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      className={iconClass}
      aria-hidden
    >
      <path
        d="M4 8h16"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16h16"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="8"
        r="2.4"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="15"
        cy="16"
        r="2.4"
        fill="none"
        stroke={s}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
