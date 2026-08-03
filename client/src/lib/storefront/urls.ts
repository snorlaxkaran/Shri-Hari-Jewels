export const storefrontHomePath = (slug: string) => `/shop/${slug}`;

export const storefrontProductPath = (slug: string, productId: string) =>
  `/shop/${slug}/products/${productId}`;

export const storefrontPathFromStoreUrl = (storeUrl: string, path = "") => {
  const base = storeUrl.replace(/\/$/, "");
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

export const storefrontProductUrl = (storeUrl: string, productId: string) =>
  storefrontPathFromStoreUrl(storeUrl, `/products/${productId}`);
