// Spotify-owned data attributes survive CSS-module hash rotation. Keep the
// legacy Spicetify alias for clients that still expose the old Canvas tree.
export const NPV_ROOT_SELECTOR = '[data-npv-root]';
export const CANVAS_SURFACE_SELECTOR = '[data-canvas-surface="true"]';
export const LEGACY_CANVAS_SELECTOR = '.canvasVideoContainerNPV';
export const NPV_CANVAS_VIDEO_SELECTOR = [
  `${NPV_ROOT_SELECTOR} ${CANVAS_SURFACE_SELECTOR} video`,
  `#Desktop_PanelContainer_Id ${CANVAS_SURFACE_SELECTOR} video`,
  `${LEGACY_CANVAS_SELECTOR} video`,
].join(',');
export const NPV_VIDEO_SELECTOR = `${NPV_ROOT_SELECTOR} video, #Desktop_PanelContainer_Id video`;
export const CINEMA_VIDEO_SKIP_SELECTOR = [
  '#main-view',
  '[data-testid="main-view"]',
  '#Desktop_PanelContainer_Id',
  NPV_ROOT_SELECTOR,
  CANVAS_SURFACE_SELECTOR,
  LEGACY_CANVAS_SELECTOR,
  '.main-nowPlayingBar-container',
  '#luminous-dynamic-background',
].join(',');
