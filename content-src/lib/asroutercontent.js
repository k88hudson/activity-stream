export function enableASRouterContent(store, asrouterContent) {
  // Enable asrouter content
  store.subscribe(() => {
    const state = store.getState();
    if (state.ASRouter.initialized && !asrouterContent.initialized) {
      asrouterContent.init();
    }
  });
  // Return this for testing purposes
  return {asrouterContent};
}
