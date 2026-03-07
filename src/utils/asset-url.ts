const baseUrl = import.meta.env.BASE_URL;
const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

function isAbsoluteExternalUrl(value: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(value);
}

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) {
    return "";
  }

  const value = url.trim();
  if (!value) {
    return "";
  }

  if (
    isAbsoluteExternalUrl(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  let path = value;

  if (path.startsWith("/src/assets/")) {
    path = `assets/${path.slice("/src/assets/".length)}`;
  } else if (path.startsWith("src/assets/")) {
    path = `assets/${path.slice("src/assets/".length)}`;
  } else if (path.startsWith("/assets/")) {
    path = path.slice(1);
  } else if (path.startsWith("/")) {
    path = path.slice(1);
  }

  if (path.startsWith("assets/")) {
    return `${normalizedBaseUrl}${path}`;
  }

  return value;
}
