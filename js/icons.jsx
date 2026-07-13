/* icons.jsx — minimal stroke UI icons. Shared via window. */
const Icon = ({ d, size = 16, fill = false, stroke = "currentColor", sw = 1.8, vb = 24, children, style }) =>
  React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 " + vb + " " + vb, style,
    fill: fill ? "currentColor" : "none",
    stroke: fill ? "none" : stroke, strokeWidth: sw,
    strokeLinecap: "round", strokeLinejoin: "round"
  }, children || (d ? React.createElement("path", { d }) : null));

const IconCheck = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />;
const IconCheckCircle = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></Icon>
);
const IconShield = (p) => (
  <Icon {...p}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></Icon>
);
const IconUser = (p) => (
  <Icon {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></Icon>
);
const IconDoc = (p) => (
  <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Icon>
);
const IconFolder = (p) => (
  <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>
);
const IconPen = (p) => (
  <Icon {...p}><path d="M16.5 4.5l3 3L8 19l-4 1 1-4z" /><path d="M14.5 6.5l3 3" /></Icon>
);
const IconUpload = (p) => (
  <Icon {...p}><path d="M12 16V5" /><path d="M8 9l4-4 4 4" /><path d="M5 19h14" /></Icon>
);
const IconCard = (p) => (
  <Icon {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></Icon>
);
const IconAward = (p) => (
  <Icon {...p}><circle cx="12" cy="9" r="5" /><path d="M9 13.5L8 21l4-2 4 2-1-7.5" /></Icon>
);
const IconAlert = (p) => (
  <Icon {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4" /><path d="M12 17.5v.01" /></Icon>
);
const IconId = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M13 9.5h5M13 13h5M5.5 15.5c.7-1.4 4.3-1.4 5 0" /></Icon>
);
const IconStethoscope = (p) => (
  <Icon {...p}><path d="M5 4v5a4 4 0 0 0 8 0V4" /><circle cx="18" cy="14" r="2.4" /><path d="M9 13v2a6 6 0 0 0 6.6 6" /></Icon>
);
const IconSend = (p) => (
  <Icon {...p}><path d="M4 12l16-7-7 16-2.5-6.5z" /></Icon>
);
const IconChevron = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Icon>;
const IconReceipt = (p) => (
  <Icon {...p}><path d="M5 3v18l2-1.4 2 1.4 2-1.4 2 1.4 2-1.4 2 1.4V3z" /><path d="M9 8h6M9 12h6" /></Icon>
);
const IconPercent = (p) => (
  <Icon {...p}><path d="M19 5L5 19" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></Icon>
);
const IconCalendar = (p) => (
  <Icon {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></Icon>
);
const IconLock = (p) => (
  <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>
);
const IconClock = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Icon>
);
const IconRefresh = (p) => (
  <Icon {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" /><path d="M4 20v-4h4" /></Icon>
);
const IconTag = (p) => (
  <Icon {...p}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" /></Icon>
);
const IconSparkle = (p) => (
  <Icon {...p}><path d="M12 3l1.7 5.1a3 3 0 0 0 1.9 1.9L20.7 12l-5.1 1.7a3 3 0 0 0-1.9 1.9L12 20.7l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.3 12l5.1-1.7a3 3 0 0 0 1.9-1.9z" /></Icon>
);
const IconGlobe = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></Icon>
);

Object.assign(window, {
  Icon, IconCheck, IconCheckCircle, IconShield, IconUser, IconDoc, IconFolder,
  IconPen, IconUpload, IconCard, IconAward, IconAlert, IconId, IconStethoscope,
  IconSend, IconChevron, IconArrowRight, IconReceipt,
  IconPercent, IconCalendar, IconLock, IconClock, IconRefresh, IconTag,
  IconSparkle, IconGlobe
});
