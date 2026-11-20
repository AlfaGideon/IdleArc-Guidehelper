export const isEnglish = globalThis.window?.IdleArcLanguage?.current === 'en';
export const t = (ru, en) => isEnglish ? en : ru;
export const bi = (ru, en) => !isEnglish && ru && en && ru !== en ? `${ru} (${en})` : (en || ru || '');
