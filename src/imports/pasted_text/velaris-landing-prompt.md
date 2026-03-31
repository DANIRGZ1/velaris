# Prompt para Landing Page de Velaris

Diseña una landing page moderna para "Velaris", una aplicacion companion de escritorio para League of Legends. La landing page debe seguir EXACTAMENTE el mismo sistema de diseno que la aplicacion y cumplir los requisitos de Riot Games para third-party apps.

## Identidad Visual de Velaris

### Paleta de Colores (Dark-first, con light mode)
- **Background:** #121214 (dark) / #fbfbfd (light)
- **Card/Surface:** #1a1a1e (dark) / #ffffff (light)
- **Foreground/Text:** #f5f5f7 (dark) / #1d1d1f (light)
- **Primary Accent (Velvet Violet):** #5e5ce6 (light mode) / #e4e4e7 neutral-silver (dark mode)
- **Muted text:** #8e8e93 (dark) / #86868b (light)
- **Secondary surfaces:** #252529 (dark) / #f5f5f7 (light)
- **Borders:** rgba(255,255,255,0.08) (dark) / rgba(0,0,0,0.06) (light)
- **Destructive/Error:** #ff453a (dark) / #ff3b30 (light)
- **Success:** #30d158 (emerald-500)
- **Warning:** #ffd60a (amber)
- **Rank colors:** Iron(gray-400), Bronze(amber-700), Silver(gray-300), Gold(yellow-500), Platinum(cyan-400), Emerald(emerald-500), Diamond(blue-400), Master(purple-500), Grandmaster(red-500), Challenger(amber-400)

### Tipografia
- **Sans-serif principal:** Inter (weights 400, 500, 600, 700)
- **Monospace (datos, stats, codigo):** JetBrains Mono (weights 400, 500, 600)
- **Brand wordmark:** "VELARIS" en tracking-[0.18em], font-semibold, 13px, uppercase

### Logo
- Logo "V" minimalista: path SVG geometrico con gradiente vertical de #3f3f46 -> #18181b -> #09090b
- Tiene un dot circular en el apex que pulsa con glow ring animado
- Animacion de loading: stroke-draw -> fill -> dot pulse
- NO tiene colores llamativos, es zinc/charcoal puro
- Path SVG del logo V: "M120 150 L220 360 Q256 420 292 360 L392 150 L330 150 L256 310 L182 150 Z" (viewBox 0 0 512 512)

### Estilo de Diseno (Inspiracion)
- **Notion:** Espaciado generoso, tipografia limpia, jerarquia visual clara
- **Linear:** Animaciones suaves con Motion (framer-motion), transiciones con ease [0.16, 1, 0.3, 1], gradientes sutiles
- **Apple HIG:** Bordes rgba con opacidad baja, border-radius 12px, backdrop-blur en headers, shadows con inset

### Patrones de UI
- **Cards:** bg-card, border border-border/40, rounded-2xl, hover con scale-[1.02] sutil
- **Badges/Tags:** rounded-full, bg-primary/10, text-primary, text-[11px], font-bold, uppercase, tracking-wider
- **Botones primarios:** bg-primary text-primary-foreground rounded-xl
- **Botones secundarios:** bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80
- **Active indicator en sidebar:** barra vertical w-1 h-5 bg-primary rounded-r-full con layoutId animation
- **Iconografia:** Lucide React, strokeWidth 2, tamanos w-4 h-4
- **Skeleton loading:** animate-pulse rounded-lg bg-secondary/30
- **Page transitions:** AnimatePresence mode="wait", fade-in opacity 0->1, duration 0.3
- **Charts:** recharts con custom DeferredContainer (ResizeObserver), colores var(--primary)
- **Tooltips:** bg-primary text-primary-foreground, arrow con rounded-[2px]
- **Selection highlight:** selection:bg-primary/20 selection:text-primary

### Window Chrome (contexto desktop)
- Title bar frameless estilo Blitz.gg: height 40px
- Botones <- -> (reload) de navegacion estilo browser
- Barra de busqueda centrada en title bar (Spotlight/Alfred style)
- Window controls nativos minimize/maximize/close a la derecha
- Sidebar 240px con nav items, connection status indicator (dot pulsante)
- Main content area con rounded-tl-[32px] y shadow inset

## Features de Velaris (para showcasing en la landing)

1. **Dashboard** - Overview completo con winrate, KDA, CS/min, vision score, tendencias, radar chart de skills
2. **Draft Intelligence** - Analisis inline en ChampSelect: traits, matchups, counters, power curves, ban suggestions
3. **Live Game Overlay** - HUD overlay durante partida con gold diff, power spikes, dragon/baron timers
4. **Match History** - Historial detallado con timeline, gold graphs, item builds, performance badges
5. **Post-Game Analysis** - Desglose automatico post-partida con actionable insights
6. **Champion Pool Manager** - Gestion de pool con mastery, winrates, favoritos, tier analysis
7. **Ward Heatmap** - Canvas rendering de posiciones de wards con zonas de mapa
8. **Power Spike Timeline** - Visualizacion de power curves por nivel/items
9. **Player Scouting** - Tags y senales de scouting (OTP, Autofilled, Tilt Streak, etc.)
10. **Tilt Tracker** - Mental health monitor con fatigue detection
11. **Goals System** - Objetivos personalizados con progress tracking
12. **Notes** - Sistema de notas con tagging por campeon/matchup
13. **Learning Path** - Ruta de aprendizaje gamificada con misiones
14. **Item Explorer** - Base de datos de items con builds y stats
15. **Multi-Account** - Hasta 5 cuentas Riot ID con auto-refresh de ranks
16. **Unified Search** - Busqueda global en title bar (campeones, players, paginas)

## Requisitos de la Landing Page

### Compliance Riot Games (OBLIGATORIO)
- Disclaimer visible: "Velaris isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc."
- NO usar el logo oficial de Riot Games ni League of Legends
- NO mostrar contenido in-game (screenshots, splash arts) directamente - solo la UI de Velaris
- Indicar claramente que es una herramienta de terceros
- Link a politica de privacidad
- Mencionar que NO recopila credenciales de Riot (usa LCU API local)

### Estructura de la Landing
1. **Hero Section** - Logo V animado, titulo "VELARIS", tagline, CTA de descarga, screenshot/mockup de la app
2. **Features Grid** - Las 16 features con iconos Lucide, descriptions cortas
3. **How It Works** - 3 pasos: Instalar -> Abrir League -> Velaris reacciona automaticamente
4. **Tech Stack / Privacy** - Tauri v2, local-only, no cloud, no API keys needed
5. **Screenshots/Mockups** - De las diferentes paginas (Dashboard, ChampSelect, Profile, etc.)
6. **Multi-language** - Mencionar soporte EN/ES/KR
7. **Download CTA** - Boton de descarga para Windows
8. **Footer** - Riot disclaimer, links, version, "Made with love for the LoL community"

### Tecnologia de la Landing
- React + Tailwind CSS v4
- Motion (framer-motion) para animaciones
- Responsive (mobile-first)
- Dark mode por defecto con toggle
- Inter + JetBrains Mono fonts
- Debe sentirse como la misma app - consistencia total de diseno
