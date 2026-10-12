import type { SVGProps } from "react";

/**
 * Inline icon set — path data copied verbatim from design/ReplyMind.dc.html
 * so the clone renders pixel-identical glyphs. Each icon accepts standard
 * SVG props (size via width/height, color via `currentColor`/className).
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, children: React.ReactNode, strokeWidth = "1.8") {
  const { width = 16, height = 16, ...rest } = props;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return base(props, <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />);
}

export function EmailIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  );
}

export function WebsiteIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
    </>
  );
}

export function UploadIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </>,
    "2"
  );
}

export function SendIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>,
    "2"
  );
}

export function CheckIcon(props: IconProps) {
  return base(props, <path d="M20 6 9 17l-5-5" />, "2.2");
}

export function ClockIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  );
}

export function FileIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return base(props, <path d="m6 9 6 6 6-6" />);
}

export function ArrowRightIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  );
}

export function MenuIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  );
}

export function CloseIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </>
  );
}

export function ChatIcon(props: IconProps) {
  return base(props, <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />);
}

/** Lightning-bolt glyph used by the journey pills (MESSAGE IN / AI DRAFTS / READY TO SEND). */
export function ZapIcon(props: IconProps) {
  return base(
    props,
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  );
}

export function channelIcon(key: "wa" | "em" | "web", props?: IconProps) {
  if (key === "wa") return <WhatsAppIcon {...props} />;
  if (key === "em") return <EmailIcon {...props} />;
  return <WebsiteIcon {...props} />;
}
