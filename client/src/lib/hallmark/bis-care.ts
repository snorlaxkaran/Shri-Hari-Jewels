export const bisCareHuidUrl = (huid: string): string =>
  `https://biscare.in/bisapp/home/markArticleSearch?huid=${encodeURIComponent(huid.trim())}`;
