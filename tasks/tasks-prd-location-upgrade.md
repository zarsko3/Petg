# Task List: Location Page UI/UX Upgrade

## Phase 1: Foundation & Layout
- [x] Task 1.1: Analyze current location page structure and identify improvement areas
  - **Files**: `src/app/location/page.tsx`, `src/components/map/*`
  - **Acceptance**: Document current state, identify key pain points, list required changes
  - **Dependencies**: None

- [x] Task 1.2: Create responsive layout foundation with split view structure
  - **Files**: `src/app/location/page.tsx`, `src/components/location/layout.tsx`
  - **Acceptance**: Responsive split view (Map ↔ List) with collapsible drawer, works on mobile/desktop
  - **Dependencies**: Task 1.1

- [ ] Task 1.3: Implement sticky action bar with key CTAs
  - **Files**: `src/components/location/action-bar.tsx`
  - **Acceptance**: Sticky bar with search, filters, and primary actions, accessible keyboard navigation
  - **Dependencies**: Task 1.2

## Phase 2: Search & Location Services
- [ ] Task 2.1: Implement debounced search input with query handling
  - **Files**: `src/components/location/search-input.tsx`, `src/hooks/useDebounce.ts`
  - **Acceptance**: Search input with 300ms debounce, updates results in real-time
  - **Dependencies**: Task 1.3

- [ ] Task 2.2: Add radius and category filters
  - **Files**: `src/components/location/filters.tsx`
  - **Acceptance**: Filter controls for radius and categories, updates results immediately
  - **Dependencies**: Task 2.1

- [ ] Task 2.3: Implement "Use my location" with graceful fallback
  - **Files**: `src/components/location/geolocation-button.tsx`, `src/hooks/useGeolocation.ts`
  - **Acceptance**: Geolocation button, handles permission denied gracefully, shows fallback options
  - **Dependencies**: Task 2.2

## Phase 3: Map Enhancements
- [ ] Task 3.1: Implement map clustering for dense points
  - **Files**: `src/components/map/clustered-markers.tsx`, `src/lib/map-clustering.ts`
  - **Acceptance**: Clustering handles 100+ points without performance degradation
  - **Dependencies**: Task 1.2

- [ ] Task 3.2: Add hover/selection sync between map and list
  - **Files**: `src/components/map/map-container.tsx`, `src/components/location/location-list.tsx`
  - **Acceptance**: Hovering map pins highlights list items, clicking syncs selection
  - **Dependencies**: Task 3.1

- [ ] Task 3.3: Implement smart pin styling and clear selected state
  - **Files**: `src/components/map/custom-markers.tsx`
  - **Acceptance**: Different pin styles for different states, clear visual feedback for selection
  - **Dependencies**: Task 3.2

## Phase 4: List Improvements
- [ ] Task 4.1: Create virtualized list component for performance
  - **Files**: `src/components/location/virtualized-list.tsx`
  - **Acceptance**: Virtualized list renders 1000+ items smoothly, maintains scroll position
  - **Dependencies**: Task 1.2

- [ ] Task 4.2: Design concise location cards with inline actions
  - **Files**: `src/components/location/location-card.tsx`
  - **Acceptance**: Cards show name, distance, status, rating/tags, with inline navigate/call/save actions
  - **Dependencies**: Task 4.1

## Phase 5: States & Error Handling
- [ ] Task 5.1: Implement skeleton loaders for loading states
  - **Files**: `src/components/location/skeleton-loader.tsx`
  - **Acceptance**: Skeleton loaders for list and map, smooth transitions
  - **Dependencies**: Task 4.2

- [ ] Task 5.2: Create empty state with recovery actions
  - **Files**: `src/components/location/empty-state.tsx`
  - **Acceptance**: Helpful empty state with suggestions and recovery actions
  - **Dependencies**: Task 5.1

- [ ] Task 5.3: Implement clear error messages and offline mode notice
  - **Files**: `src/components/location/error-states.tsx`
  - **Acceptance**: Clear error messages, offline mode detection and notice
  - **Dependencies**: Task 5.2

## Phase 6: Details Panel
- [ ] Task 6.1: Create slide-in detail panel component
  - **Files**: `src/components/location/detail-panel.tsx`
  - **Acceptance**: Slide-in panel with photos, hours, status, and primary CTA
  - **Dependencies**: Task 3.3

- [ ] Task 6.2: Integrate detail panel with map and list interactions
  - **Files**: `src/components/location/location-container.tsx`
  - **Acceptance**: Clicking items opens detail panel, panel closes properly, keyboard accessible
  - **Dependencies**: Task 6.1

## Phase 7: Accessibility & Performance
- [ ] Task 7.1: Implement full keyboard navigation and focus management
  - **Files**: `src/components/location/keyboard-nav.tsx`, update existing components
  - **Acceptance**: Full keyboard support, proper focus order, ARIA labels
  - **Dependencies**: Task 6.2

- [ ] Task 7.2: Optimize performance with lazy loading and code splitting
  - **Files**: `src/app/location/page.tsx`, `next.config.js`
  - **Acceptance**: LCP ≤2.5s, TTI ≤3.5s, lazy-loaded map SDK, code-split heavy components
  - **Dependencies**: Task 7.1

- [ ] Task 7.3: Add image optimizations and final performance tuning
  - **Files**: `src/components/location/optimized-images.tsx`, performance monitoring
  - **Acceptance**: Optimized images, final performance benchmarks met
  - **Dependencies**: Task 7.2

## Phase 8: Testing & Polish
- [ ] Task 8.1: Add comprehensive tests for all components
  - **Files**: `src/components/location/__tests__/*.test.tsx`
  - **Acceptance**: Unit tests for all components, integration tests for key flows
  - **Dependencies**: Task 7.3

- [ ] Task 8.2: Final accessibility audit and WCAG AA compliance
  - **Files**: All location components
  - **Acceptance**: WCAG AA compliance verified, all accessibility issues resolved
  - **Dependencies**: Task 8.1

- [ ] Task 8.3: Cross-browser testing and final polish
  - **Files**: All location components
  - **Acceptance**: Works on all target browsers, final UI polish applied
  - **Dependencies**: Task 8.2
