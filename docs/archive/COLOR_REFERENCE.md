# Quick Color Reference - Navy Blue Theme

## Primary Colors (Use These!)

### Navy Blue (Primary)
```css
--color-primary: hsl(220, 80%, 45%);
--color-primary-dark: hsl(220, 85%, 35%);
--color-primary-light: hsl(220, 75%, 55%);
```
**Use for:** Buttons, links, active states, focus indicators, badges

### Professional Grey (Secondary)
```css
--color-secondary: hsl(210, 15%, 50%);
```
**Use for:** Secondary buttons, borders, subtle accents

### Accent Blue
```css
--color-accent: hsl(220, 70%, 50%);
```
**Use for:** Highlights, special features, call-to-action elements

## Background Colors

### Dark Mode
```css
--bg-primary: hsl(220, 25%, 10%);    /* Main background */
--bg-secondary: hsl(220, 22%, 14%);  /* Cards, panels */
--bg-tertiary: hsl(220, 20%, 18%);   /* Elevated elements */
--bg-elevated: hsl(220, 22%, 16%);   /* Modals, dropdowns */
```

### Light Mode
```css
--bg-primary: hsl(0, 0%, 100%);      /* Pure white background */
--bg-secondary: hsl(210, 20%, 98%);  /* Subtle blue-white */
--bg-tertiary: hsl(210, 18%, 95%);   /* Light grey-blue */
--bg-elevated: hsl(0, 0%, 100%);     /* White for elevation */
```

## Text Colors

### Dark Mode
```css
--text-primary: hsl(0, 0%, 98%);     /* Main text - almost white */
--text-secondary: hsl(210, 10%, 75%); /* Secondary text - light grey-blue */
--text-tertiary: hsl(210, 8%, 55%);   /* Tertiary text - medium grey-blue */
--text-disabled: hsl(210, 5%, 40%);   /* Disabled text - dark grey-blue */
```

### Light Mode
```css
--text-primary: hsl(220, 25%, 15%);   /* Main text - dark navy */
--text-secondary: hsl(220, 15%, 35%); /* Secondary text - medium navy */
--text-tertiary: hsl(220, 10%, 50%);  /* Tertiary text - grey-navy */
--text-disabled: hsl(220, 5%, 65%);   /* Disabled text - light grey */
```

## Gradients

### Primary Gradient
```css
--gradient-primary: linear-gradient(135deg, hsl(220, 80%, 45%) 0%, hsl(220, 70%, 50%) 100%);
```
**Use for:** Primary buttons, hero sections, user message bubbles

### Success Gradient
```css
--gradient-success: linear-gradient(135deg, hsl(140, 70%, 55%) 0%, hsl(160, 80%, 50%) 100%);
```
**Use for:** Success messages, completed states

### Danger Gradient
```css
--gradient-danger: linear-gradient(135deg, hsl(0, 85%, 60%) 0%, hsl(15, 85%, 55%) 100%);
```
**Use for:** Error messages, delete actions

## Borders

```css
--border-color: hsl(220, 18%, 22%);       /* Dark mode */
--border-color-light: hsl(220, 16%, 28%); /* Dark mode - lighter */

/* Light mode borders */
--border-color: hsl(220, 16%, 88%);
--border-color-light: hsl(220, 16%, 92%);
```

## Shadows

### Dark Mode
```css
--shadow-sm: 0 2px 8px hsla(0, 0%, 0%, 0.2);
--shadow-md: 0 4px 16px hsla(0, 0%, 0%, 0.3);
--shadow-lg: 0 8px 32px hsla(0, 0%, 0%, 0.4);
--shadow-xl: 0 16px 48px hsla(0, 0%, 0%, 0.5);
```

### Light Mode
```css
--shadow-sm: 0 2px 8px hsla(220, 25%, 20%, 0.08);
--shadow-md: 0 4px 16px hsla(220, 25%, 20%, 0.12);
--shadow-lg: 0 8px 32px hsla(220, 25%, 20%, 0.16);
--shadow-xl: 0 16px 48px hsla(220, 25%, 20%, 0.2);
```

## Usage Examples

### Button with Primary Color
```css
.my-button {
  background: var(--gradient-primary);
  color: white;
  box-shadow: 0 4px 12px hsla(220, 80%, 45%, 0.3);
}

.my-button:hover {
  box-shadow: 0 6px 20px hsla(220, 80%, 45%, 0.4);
}
```

### Input Focus State
```css
.my-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px hsla(220, 80%, 45%, 0.1);
}
```

### Badge/Notification
```css
.my-badge {
  background: var(--color-primary);
  color: white;
}
```

### Unread/Active State
```css
.unread-item {
  background: hsla(220, 80%, 45%, 0.05);
}

.unread-item:hover {
  background: hsla(220, 80%, 45%, 0.1);
}
```

## Color Psychology

**Navy Blue** conveys:
- Trust and reliability
- Professionalism
- Stability and confidence
- Intelligence and expertise

**White** conveys:
- Cleanliness and simplicity
- Modernity
- Spaciousness
- Clarity

**Grey** conveys:
- Neutrality and balance
- Sophistication
- Professionalism
- Timelessness

This color combination is ideal for:
- Corporate applications
- Engineering/technical platforms
- Professional dashboards
- B2B software
- Management systems
