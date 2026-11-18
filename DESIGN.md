# PaperPhonePlus Design System

## 1. Product character

PaperPhonePlus is a private, end-to-end encrypted mobile messenger. Its interface
combines Apple's quiet, content-first interaction model with a warm paper-gold
identity. It should feel trustworthy, calm, fast, and native rather than like a
marketing website or a desktop SaaS dashboard.

Use this document for application screens. It intentionally adapts ideas from
Apple-style interfaces instead of copying Apple marketing layouts.

### Design principles

1. **Messages are the product.** Chrome recedes; conversation content has the
   strongest visual weight.
2. **Gold means PaperPhone.** Gold identifies primary actions, active navigation,
   and brand moments. It is not a generic warning color.
3. **Security is legible, not theatrical.** Explain encryption with concise text,
   familiar icons, and clear state. Avoid neon glows, hacker imagery, and excessive
   lock decoration.
4. **Glass belongs to chrome.** Translucency is reserved for navigation bars,
   composer bars, sheets, and overlays. Message bubbles and ordinary list rows use
   stable, readable surfaces.
5. **One-handed by default.** Primary controls are reachable, touch targets are at
   least 44×44 CSS pixels, and every screen respects device safe areas.

## 2. Color system

### Light theme

| Token | Value | Role |
| --- | --- | --- |
| `bg-primary` | `#f2f2f7` | App canvas and conversation background |
| `bg-secondary` | `#ffffff` | Solid elevated surface and incoming bubble |
| `bg-tertiary` | `#e5e5ea` | Dividers and disabled surfaces |
| `text-primary` | `#1c1c1e` | Primary text |
| `text-secondary` | `#636366` | Supporting text and message previews |
| `text-muted` | `#8e8e93` | Timestamps, placeholders, disabled labels |
| `accent` | `#d4a017` | PaperPhone brand and primary action |
| `accent-pressed` | `#b8860b` | Pressed primary action |
| `accent-soft` | `rgba(212, 160, 23, 0.12)` | Selection and active-navigation backing |
| `system-link` | `#007aff` | Links and neutral informational actions |
| `success` | `#34c759` | Online, delivered, verified, successful |
| `warning` | `#ff9f0a` | Expiry and caution states only |
| `danger` | `#ff3b30` | Destructive action, failed send, unread badge |
| `separator` | `rgba(60, 60, 67, 0.18)` | Hairline separators |

### Dark theme

| Token | Value | Role |
| --- | --- | --- |
| `bg-primary` | `#000000` | App canvas |
| `bg-secondary` | `#1c1c1e` | Solid elevated surface and incoming bubble |
| `bg-tertiary` | `#2c2c2e` | Secondary controls |
| `text-primary` | `#f5f5f7` | Primary text |
| `text-secondary` | `#aeaeb2` | Supporting text |
| `text-muted` | `#8e8e93` | Timestamps and placeholders |
| `system-link` | `#0a84ff` | Links and neutral informational actions |
| `separator` | `rgba(84, 84, 88, 0.65)` | Hairline separators |

Gold must maintain readable contrast. Use white text on a darkened gold fill for
large primary buttons. On pale backgrounds, use the darker gold variant for text.
Do not use gold for warnings; warning orange and danger red retain their semantic
meaning.

## 3. Typography

Use the platform system font. Never require a network font for core UI.

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
  "Noto Sans", "Helvetica Neue", Arial, sans-serif;
```

| Style | Size / line height | Weight | Usage |
| --- | --- | --- | --- |
| Navigation title | `17px / 22px` | 600 | Page and conversation titles |
| Section title | `20px / 25px` | 600 | Major in-page section |
| Body | `16px / 22px` | 400 | Messages, inputs, settings |
| List name | `15px / 20px` | 500 | Contact and conversation name |
| Supporting | `13px / 18px` | 400 | Preview, status, helper text |
| Caption | `12px / 16px` | 400 | Timestamp and metadata |
| Tab label | `10px / 12px` | 500 | Bottom navigation only |

Use sentence case. Avoid all-caps labels. Allow user-generated messages to wrap and
scale; do not apply negative tracking to message text. Chinese, Japanese, Korean,
Cyrillic, and Latin scripts must share a visually balanced fallback stack.

## 4. Shape, spacing, and depth

### Spacing

Use a 4px base grid: `4, 8, 12, 16, 20, 24, 32, 40`.

- Page horizontal inset: 16px.
- Compact control gap: 8px.
- List row vertical padding: 12px.
- Message-to-message gap: 4px for the same sender, 12px when sender changes.
- Major section gap: 24px.

### Radius

| Token | Value | Usage |
| --- | --- | --- |
| `sm` | `10px` | Compact controls and menus |
| `md` | `14px` | Cards, inputs, attachment tiles |
| `lg` | `20px` | Message bubbles and sheets |
| `xl` | `28px` | Floating bottom navigation |
| `full` | `9999px` | Avatars, badges, circular buttons |

### Elevation

- Prefer surface color and a hairline border over shadow.
- Navigation glass may use one soft shadow no darker than 8% black in light mode.
- Modals and sheets may use a larger shadow, but never stack multiple glowing
  shadows.
- Avatars and ordinary message bubbles should not glow.

## 5. Materials

Glass surfaces may be used for the page header, bottom tab bar, chat composer,
modal, and action sheet. Use a translucent theme surface with approximately
`24px` blur and `160%` saturation. Always provide an opaque fallback.

Do not use backdrop blur on:

- message bubbles;
- conversation rows;
- settings rows;
- media cards;
- warning or encryption banners.

When reduced transparency is requested, glass becomes an opaque `bg-secondary`
surface. When reduced motion is requested, remove entrance animations, glow
animations, and spring scaling.

## 6. Core components

### Navigation bar

- 56px content height plus top safe-area inset.
- Center or leading-align a 17px semibold title according to screen context.
- Back and utility buttons have a 44×44px hit area.
- Use gold for the primary route action; use `system-link` for informational links.

### Bottom tab bar

- Four destinations: Chats, Contacts, Discover, Profile.
- The active tab uses a gold icon and label on a subtle gold backing.
- Inactive tabs use muted text; do not place each tab inside a separate card.
- Unread badges use danger red and must not depend on color alone: include a count.

### Conversation list row

- Avatar: 44×44px.
- Primary line: contact/group name; truncate to one line.
- Secondary line: latest message summary; truncate to one line.
- Trailing column: timestamp above unread badge.
- Online green is a small status indicator, never a large label.
- Rows use a flat surface with a subtle pressed state, not floating glass cards.

### Message bubble

- Incoming: solid secondary surface, primary text.
- Outgoing: restrained gold surface with contrast-checked text.
- Maximum width: 78% of the conversation column.
- Use 18–20px outer radius and a slightly tighter radius toward the sender edge.
- Group consecutive messages before repeating avatar/name metadata.
- Place delivery/read state beside the outgoing timestamp. Never communicate a
  failed send through color alone; include an icon and accessible label.
- Long text, URLs, emoji, CJK text, and right-to-left text must wrap safely.

### Composer

- Anchored above the bottom safe area.
- Text field minimum height: 40px; action hit areas: 44×44px.
- The send control is gold only when content can be sent. Disabled state is neutral.
- Attachment and emoji actions remain secondary and must not compete with Send.
- Keyboard focus uses a visible 2px gold ring with a soft outer halo.

### Buttons

- Primary: solid PaperPhone gold, pill shape, minimum height 44px.
- Secondary: neutral solid or glass surface, depending on context.
- Destructive: system danger red; require confirmation for irreversible operations.
- Icon-only: circular 44px hit area and an accessible name.
- Avoid decorative gradients and shimmer on ordinary utility buttons.

### Security and warning banners

- Encryption state uses a shield/lock icon, a concise heading, and optional detail.
- Warning banners use semantic warning yellow/orange, not brand gold.
- Group-chat encryption limitations must be visually persistent until resolved.
- Never claim encryption merely through an icon; display the actual state in text.

### Empty, loading, and error states

- Empty states use one quiet line icon, a short explanation, and at most one action.
- Use skeletons only where layout is known; otherwise use a compact progress label.
- Retry errors remain near the failed operation and preserve the user's input.

## 7. Motion and feedback

- Standard transition: 200ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Page entrance: subtle opacity and at most 8px vertical movement.
- Press feedback: scale no smaller than 0.96 for buttons and 0.98 for rows.
- Never animate message content while the user is selecting or copying it.
- Haptics may accompany Send, call connect, and destructive confirmation in native
  shells, but the interface must remain understandable without haptics.

## 8. Responsive and accessibility rules

- Primary layout targets 320–480px phone widths.
- Respect top, bottom, left, and right safe-area insets in every orientation.
- Minimum touch target: 44×44px on coarse pointers.
- Text must remain usable at 200% browser zoom without horizontal page scrolling.
- Interactive controls need `:focus-visible` treatment and accessible names.
- Never disable zoom.
- Support `prefers-reduced-motion`, `prefers-contrast`, and reduced-transparency
  fallbacks where available.
- Body text and essential icons target WCAG AA contrast.
- Do not use color as the only indication of online, unread, failed, selected,
  encrypted, or verified state.

## 9. Do and don't

### Do

- Keep conversations visually quiet and content-first.
- Use gold sparingly and consistently for PaperPhone identity.
- Prefer stable solid surfaces behind long-form message content.
- Test both themes with long multilingual strings and large dynamic text.
- Keep navigation and composer behavior familiar across iOS and Android.

### Don't

- Do not reproduce Apple marketing hero layouts inside the app.
- Do not turn the UI purple to resemble Slack or orange to resemble Intercom.
- Do not cover every card with blur, gloss, gradients, or glow.
- Do not use proprietary brand fonts that are unavailable to users.
- Do not hide privacy or encryption limitations behind decorative visuals.
- Do not sacrifice Android usability to imitate iOS chrome literally.

## 10. Agent implementation prompt

When building or modifying PaperPhonePlus UI, preserve existing behavior and use
this system as the source of truth. Build a mobile-first, content-led messenger
with platform-system typography, calm Apple-inspired hierarchy, PaperPhone gold
for primary brand actions, solid readable message surfaces, and glass only on
navigation/composer overlays. Implement both themes, safe areas, 44px touch targets,
keyboard focus, reduced motion, and long multilingual content. Do not introduce
marketing-page patterns or copy another company's brand identity.

## 2.6.6 media interaction

Display avatars and social/chat media from the persistent client cache on repeat views; refresh on page reload or reconnect. Keep the Timeline list mounted while viewing a post and restore its scroll position on return. Show filename, percentage and a native progress bar during image/video uploads; prevent concurrent selection and publishing until uploads finish. Real-time call streams remain live media.
