# Design System Style Guide

*Auto-generated from design tokens - Last updated: 2024*

## 🎨 Color System

### Semantic Colors
These colors automatically adapt to light/dark themes and maintain consistent contrast ratios.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `hsl(0 0% 100%)` | `hsl(222.2 84% 4.9%)` | Page backgrounds |
| `foreground` | `hsl(222.2 84% 4.9%)` | `hsl(210 40% 98%)` | Primary text |
| `primary` | `hsl(221.2 83.2% 53.3%)` | `hsl(217.2 91.2% 59.8%)` | CTAs, links |
| `secondary` | `hsl(210 40% 96%)` | `hsl(217.2 32.6% 17.5%)` | Secondary actions |
| `muted` | `hsl(210 40% 96%)` | `hsl(217.2 32.6% 17.5%)` | Subtle backgrounds |
| `accent` | `hsl(210 40% 96%)` | `hsl(217.2 32.6% 17.5%)` | Highlights |
| `destructive` | `hsl(0 84.2% 60.2%)` | `hsl(0 62.8% 30.6%)` | Errors, warnings |
| `border` | `hsl(214.3 31.8% 91.4%)` | `hsl(217.2 32.6% 17.5%)` | Borders, dividers |

### Brand Colors
Core PETG brand identity colors - consistent across all themes.

| Token | Value | Usage |
|-------|-------|-------|
| `petg.purple` | `#8844ee` | Primary brand color |
| `petg.yellow` | `#ffdd22` | Secondary brand color |
| `petg.white` | `#ffffff` | Neutral brand color |

### Domain-Specific Colors
Contextual colors for specific app features.

| Domain | Primary | Light | Dark | Usage |
|--------|---------|-------|------|-------|
| `health` | `#22c55e` | `#86efac` | `#15803d` | Battery, vitals |
| `connectivity` | `#3b82f6` | `#93c5fd` | `#1d4ed8` | Network status |
| `activity` | `#a855f7` | `#d8b4fe` | `#7e22ce` | Movement, play |
| `neutral` | `#6b7280` | `#e5e7eb` | `#374151` | General states |

## 📏 Spacing System

### Standard Scale
Consistent spacing that scales across different screen sizes.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `0.25rem` (4px) | Minimal spacing |
| `sm` | `0.5rem` (8px) | Small spacing |
| `md` | `0.75rem` (12px) | Medium spacing |
| `lg` | `1rem` (16px) | Standard spacing |
| `xl` | `1.5rem` (24px) | Large spacing |
| `2xl` | `2rem` (32px) | Extra large spacing |
| `3xl` | `3rem` (48px) | Maximum spacing |

### Component-Specific Spacing
Responsive spacing values for different components.

| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| `card` | `24px` | `20px` | `16px` |
| `section.vertical` | `40px` | `32px` | `24px` |
| `section.horizontal` | `24px` | `20px` | `16px` |

### Layout Spacing
Fixed spacing values for layout elements.

| Element | Value | Usage |
|---------|-------|-------|
| `sidebar.expanded` | `240px` | Full sidebar width |
| `sidebar.collapsed` | `72px` | Collapsed sidebar width |
| `topbar` | `64px` | Header height |
| `container` | `2rem` | Content padding |

## 🔤 Typography Scale

### Font Families
| Token | Value | Usage |
|-------|-------|-------|
| `sans` | `Outfit, sans-serif` | Primary text |
| `outfit` | `Outfit, sans-serif` | Brand typography |

### Font Sizes
Semantic font sizes for different content types.

| Token | Value | Usage |
|-------|-------|-------|
| `h1` | `32px` | Page titles |
| `h2` | `28px` | Section headings |
| `h3` | `24px` | Sub-headings |
| `subtitle` | `18px` | Subtitle text |
| `body` | `14px` | Body text |
| `small` | `12px` | Caption text |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `normal` | `400` | Body text |
| `medium` | `500` | Emphasized text |
| `semibold` | `600` | Headings |
| `bold` | `700` | Strong emphasis |

### Line Heights
| Token | Value | Usage |
|-------|-------|-------|
| `tight` | `1.2` | Headings |
| `normal` | `1.5` | Body text |
| `relaxed` | `1.75` | Long-form content |

## 🔘 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `none` | `0px` | No rounding |
| `sm` | `calc(var(--radius) - 4px)` | Small corners |
| `md` | `calc(var(--radius) - 2px)` | Medium corners |
| `lg` | `var(--radius)` | Standard corners |
| `xl` | `12px` | Large corners |
| `2xl` | `16px` | Extra large corners |
| `3xl` | `24px` | Maximum corners |
| `full` | `9999px` | Fully rounded |
| `card` | `12px` | Card corners |
| `button` | `8px` | Button corners |
| `pill` | `9999px` | Pill buttons |

## 🌓 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle elevation |
| `md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)...` | Standard elevation |
| `lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)...` | Prominent elevation |
| `xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)...` | Maximum elevation |

## ⚡ Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `default` | `200ms ease-in-out` | Standard transitions |
| `fast` | `100ms ease-in-out` | Quick interactions |
| `slow` | `300ms ease-in-out` | Deliberate animations |

## 🖥️ Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `mobile` | `480px` | Small screens |
| `tablet` | `768px` | Medium screens |
| `desktop` | `1024px` | Large screens |
| `wide` | `1280px` | Extra wide screens |
| `2xl` | `1400px` | Maximum width |

---

## 🌐 Platform Usage

### Web (Tailwind CSS)

```tsx
// Semantic colors with automatic light/dark mode
<div className="bg-primary text-primary-foreground">
  Primary button
</div>

// Brand colors
<div className="bg-petg-purple text-white">
  Brand element
</div>

// Domain-specific colors
<div className="bg-health-primary text-white">
  Health indicator
</div>

// Responsive spacing
<div className="p-lg md:p-xl lg:p-2xl">
  Responsive padding
</div>

// Typography scale
<h1 className="text-h1 font-semibold">Main heading</h1>
<p className="text-body font-normal">Body text</p>
```

### React Native

```tsx
import { 
  getColor, 
  getSpacing, 
  getFontSize, 
  getBorderRadius,
  createTheme 
} from '@/packages/ui/native/tokens';

// Direct token access
const styles = StyleSheet.create({
  container: {
    backgroundColor: getColor('semantic.primary', 'light'),
    padding: parseInt(getSpacing('padding.lg')),
    borderRadius: getBorderRadius('card'),
  },
  text: {
    fontSize: parseInt(getFontSize('body')),
    color: getColor('semantic.foreground', 'light'),
  },
});

// Theme-based styling
const theme = createTheme('light');
const dynamicStyles = {
  backgroundColor: theme.colors.primary,
  padding: parseInt(theme.spacing.lg),
  borderRadius: theme.borderRadius.card,
};
```

### Usage Examples

#### Button Component
```tsx
// Web
<Button 
  variant="default" 
  size="lg" 
  className="bg-primary hover:bg-primary/90"
>
  Click me
</Button>

// React Native
<Button 
  variant="default" 
  size="lg" 
  style={{
    backgroundColor: getColor('semantic.primary'),
    paddingHorizontal: parseInt(getSpacing('padding.xl')),
  }}
>
  Click me
</Button>
```

#### Card Component
```tsx
// Web
<Card className="p-lg border-border">
  <CardHeader>
    <CardTitle className="text-h3">Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>

// React Native
<Card style={{
  padding: parseInt(getSpacing('padding.lg')),
  borderColor: getColor('semantic.border'),
  borderRadius: getBorderRadius('card'),
}}>
  <CardHeader>
    <CardTitle style={{
      fontSize: parseInt(getFontSize('h3')),
      color: getColor('semantic.foreground'),
    }}>
      Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

---

## 🔄 Synchronization

### Automatic Updates
This style guide is automatically regenerated when design tokens change.

### Update Process
1. Modify `packages/ui/design-tokens.json`
2. Run `npm run sync-tokens`
3. Review generated files
4. Commit with conventional format: `feat(tokens): sync design-system v1.0`

### CI/CD Integration
- **Pull Requests**: Validate token schema
- **Main Branch**: Auto-sync and deploy
- **Token Changes**: Regenerate all platform configurations

### Files Generated
- `packages/ui/native/tokens.ts` - React Native tokens
- `tailwind.config.js` - Web Tailwind configuration
- `STYLE_GUIDE.md` - This documentation

---

## 🎯 Best Practices

### Do's ✅
- Always use semantic color tokens (`primary`, `secondary`, etc.)
- Prefer spacing tokens over hard-coded values
- Use responsive spacing for different screen sizes
- Maintain consistent typography hierarchy
- Test components in both light and dark modes

### Don'ts ❌
- Don't use hard-coded colors or spacing values
- Don't mix different color systems
- Don't ignore responsive design principles
- Don't override theme colors for decorative purposes
- Don't use deprecated token names

### Performance
- Tokens are statically analyzed and tree-shaken
- Colors are converted to platform-native formats
- No runtime calculation overhead
- Optimized for both web and mobile platforms

---

*🤖 Generated automatically by design system sync - Do not edit manually* 