import type { SVGProps } from "react";

export function TelegramLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M120 0a120 120 0 1 0 0 240 120 120 0 0 0 0-240Zm58.9 82.2-19.7 92.9c-1.5 6.6-5.4 8.2-10.9 5.1l-30.1-22.2-14.5 14c-1.6 1.6-3 3-6.1 3l2.2-30.7 55.8-50.4c2.4-2.2-.5-3.4-3.8-1.2l-69 43.4-29.7-9.3c-6.5-2-6.6-6.5 1.4-9.6l116.1-44.8c5.4-2 10.1 1.3 8.3 9.8Z"
      />
    </svg>
  );
}
