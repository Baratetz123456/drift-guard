import { useEffect } from 'react';

export interface PageMetadataOptions {
  title: string;
  description?: string;
  canonicalPath?: string;
  robots?: 'index, follow' | 'noindex, nofollow';
  ogType?: 'website' | 'article';
  ogImage?: string;
}

const DEFAULT_SITE_URL = import.meta.env.VITE_APP_SITE_URL || 'https://driftguard.network';
const DEFAULT_IMAGE = `${DEFAULT_SITE_URL}/og-image.svg`;
const DEFAULT_DESCRIPTION =
  'Enterprise network verification platform for Cisco snapshot collection, visual diffing, and advisory AI risk analysis. Before. After. Understood.';

function setMetaTag(key: string, value: string, isProperty = false) {
  const selector = isProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let element = document.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    if (isProperty) {
      element.setAttribute('property', key);
    } else {
      element.setAttribute('name', key);
    }
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

function setCanonical(url: string) {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

export function usePageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  robots = 'noindex, nofollow',
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
}: PageMetadataOptions) {
  useEffect(() => {
    // Synchronize page title
    document.title = title;

    // Synchronize meta description and indexing directives
    setMetaTag('description', description);
    setMetaTag('robots', robots);

    const fullCanonicalUrl = `${DEFAULT_SITE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    setCanonical(fullCanonicalUrl);

    // Synchronize Open Graph protocol
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:url', fullCanonicalUrl, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:image', ogImage.startsWith('http') ? ogImage : `${DEFAULT_SITE_URL}${ogImage}`, true);

    // Synchronize Twitter Cards
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage.startsWith('http') ? ogImage : `${DEFAULT_SITE_URL}${ogImage}`);
  }, [title, description, canonicalPath, robots, ogType, ogImage]);
}
