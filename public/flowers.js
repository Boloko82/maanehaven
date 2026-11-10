// How the flowers look and what they are called (display only; rules live on the server).
export const FLOWER_LOOK = {
  maaneklokke: { name: 'Måneklokke', petal: '#7fb4ff', centre: '#f3e3a6' },
  natviol: { name: 'Natviol', petal: '#b38cff', centre: '#ffe08a' },
  soelvrose: { name: 'Sølvrose', petal: '#dfe6f2', centre: '#c9a6d8' },
  stjernetidsel: { name: 'Stjernetidsel', petal: '#ff9fd0', centre: '#fff2a8' },
  tvillingelilje: { name: 'Tvillingelilje', petal: '#ffd27a', centre: '#ff8fa8' },
};
export const MOON_NAMES = { nymaane: 'Nymåne', tiltagende: 'Tiltagende måne', fuldmaane: 'Fuldmåne', aftagende: 'Aftagende måne' };
export const MOON_EFFECTS = {
  nymaane: 'flere natsværmere',
  tiltagende: 'en helt almindelig nat',
  fuldmaane: 'alt gror hurtigere',
  aftagende: 'jorden holder sig fugtig længere',
};
export const PHASE_ORDER = ['nymaane', 'tiltagende', 'fuldmaane', 'aftagende'];
