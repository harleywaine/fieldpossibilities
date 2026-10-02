'use client';

import { useState } from 'react';

/*
 * Field International's brand, as published on fieldinternational.com.
 *
 * Colours and type come from the site's own design tokens: primary blue
 * #034694, secondary blue #7EA7D7, accent red #A21212, grey-blue background
 * #F2F4F7, Roboto throughout (light for headings). The logo is the site's own
 * SVG, loaded from Field's server like the catalogue photographs, with a small
 * PNG fallback in /public/brand should that ever fail. Photographs are Field's
 * published images, loaded from their site; nothing is copied into the repo.
 */

export const BRAND = {
  blue: '#034694',
  lightBlue: '#7EA7D7',
  red: '#A21212',
  surface: '#F2F4F7',
  navy: '#02193a',
} as const;

const SITE = 'https://www.fieldinternational.com/wp-content/uploads';

export const LOGO_SVG = `${SITE}/2021/03/field-international-logo.svg`;
export const LOGO_PNG = '/brand/field-logo.png';

/** Field's published photography, by what it shows. */
export const PHOTOS = {
  /** A Boeing 777 on the ground, Field's own hero image. */
  hero777: `${SITE}/2021/03/Boeing777-scaled.jpg`,
  /** A CNC operator at the Poole works. */
  cnc: `${SITE}/2021/03/FIUK-CNC-OP1-scaled.jpg`,
  /** FIL products in the workshop. */
  products: `${SITE}/2021/03/FILProducts.jpg`,
  /** The globe watermark Field uses behind dark sections. */
  watermark: `${SITE}/2021/02/field-watermark1.png`,
  swoosh: `${SITE}/2021/02/swoosh-background.jpg`,
  worldMap: `${SITE}/2021/02/World-Map-grey.png`,
  sites: {
    poole: `${SITE}/2021/03/field-international-hq-uk.jpg`,
    seletar: `${SITE}/2023/07/Companies-Seletar-1024x769.jpg`,
    jiaxing: `${SITE}/2024/03/The-front-door-of-the-Company-1.jpg`,
    chennai: `${SITE}/2024/02/Remove-Motor-Cycle-Final-1024x659.jpg`,
    pensacola: `${SITE}/2021/08/FieldUSABuilding-1024x768.jpg`,
    abuDhabi: `${SITE}/2023/12/Middle-East-1024x768.jpg`,
  },
} as const;

/**
 * The full logo: globe over the wordmark. Best at 40px tall and up, where the
 * wordmark stays legible. `tone="white"` for dark grounds.
 */
export function FieldLogo({ height, tone = 'blue', className = '' }: { height?: number; tone?: 'blue' | 'white'; className?: string }) {
  const [src, setSrc] = useState<string>(LOGO_SVG);
  return (
    <img
      src={src}
      onError={() => { if (src !== LOGO_PNG) setSrc(LOGO_PNG); }}
      alt="Field International"
      draggable={false}
      style={{ height, width: 'auto', filter: tone === 'white' ? 'brightness(0) invert(1)' : undefined }}
      className={`block w-auto select-none ${className}`}
    />
  );
}

/**
 * The wordmark alone, for slim bars where the stacked logo would shrink the
 * name to nothing. The letterforms are the ones in Field's own logo file;
 * `currentColor` lets it sit on light or dark.
 */
export function FieldWordmark({ className = '', title = 'Field International' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="31 171 367 38" role="img" aria-label={title} className={`block h-[14px] w-auto ${className}`} fill="currentColor">
      <path d="M33.098,173.398h23.545v6.19H40.461v7.74h14.024v5.721H40.461v13.837h-7.364L33.098,173.398L33.098,173.398z" />
      <path d="M68.886,178.887h-6.66v-5.488h6.66V178.887z M62.226,182.639h6.66v24.25h-6.66V182.639z" />
      <path d="M81.456,196.381c0.188,4.223,2.251,6.145,5.957,6.145c2.674,0,4.831-1.641,5.253-3.143h5.863c-1.876,5.723-5.863,8.161-11.351,8.161c-7.645,0-12.383-5.253-12.383-12.757c0-7.271,5.019-12.805,12.383-12.805c8.255,0,12.242,6.94,11.772,14.397L81.456,196.381L81.456,196.381z M92.291,192.16c-0.61-3.377-2.064-5.159-5.3-5.159c-4.221,0-5.44,3.283-5.535,5.159H92.291z" />
      <path d="M104.91,173.398h6.66v33.488h-6.66V173.398z" />
      <path d="M135.96,203.792h-0.094c-1.548,2.626-4.268,3.752-7.364,3.752c-7.317,0-10.881-6.284-10.881-12.991c0-6.52,3.611-12.57,10.741-12.57c2.861,0,5.675,1.22,7.223,3.611h-0.048h0.095v-12.195h6.66v33.49h-6.332V203.792L135.96,203.792z M130.144,187.001c-4.362,0-5.863,3.752-5.863,7.739c0,3.799,1.735,7.785,5.863,7.785c4.409,0,5.722-3.846,5.722-7.832C135.866,190.753,134.459,187.001,130.144,187.001z" />
      <path d="M149.563,173.398h2.063v33.488h-2.063V173.398z" />
      <path d="M159.038,182.779h1.783v5.16h0.093c1.22-3.611,4.878-5.724,8.63-5.724c8.489,0,8.583,6.802,8.583,9.757v14.914h-1.782v-15.242c0-2.486-0.282-7.881-6.848-7.881c-5.394,0-8.677,4.176-8.677,10.086v13.037h-1.783L159.038,182.779L159.038,182.779z" />
      <path d="M194.076,184.328h-5.252v16.838c0,3.893,1.829,4.268,5.206,4.174v1.549c-3.658,0.233-7.176-0.283-6.988-5.723v-16.838h-4.456v-1.549h4.456v-7.504h1.783v7.504h5.252L194.076,184.328L194.076,184.328z" />
      <path d="M199.893,195.068c-0.094,5.676,2.908,10.834,8.865,10.834c4.55,0,7.786-2.721,8.63-7.176h1.782c-0.938,5.629-4.69,8.725-10.413,8.725c-7.036,0-10.741-5.535-10.647-12.195c-0.094-6.613,3.377-13.039,10.647-13.039c7.551,0,10.928,5.957,10.6,12.852H199.893L199.893,195.068z M217.574,193.52c-0.095-5.063-3.283-9.754-8.817-9.754c-5.347,0-8.49,4.971-8.865,9.754H217.574z" />
      <path d="M227.146,188.127h0.142c0.938-3.143,4.878-5.676,9.239-5.488v1.783c-1.877-0.234-4.504,0.234-6.66,2.346c-1.781,1.828-2.533,3.33-2.721,6.94v13.181h-1.783v-24.109h1.783V188.127z" />
      <path d="M240.231,182.779h1.783v5.16h0.092c1.222-3.611,4.879-5.724,8.631-5.724c8.49,0,8.582,6.802,8.582,9.757v14.914h-1.78v-15.242c0-2.486-0.281-7.881-6.849-7.881c-5.394,0-8.676,4.176-8.676,10.086v13.037h-1.783V182.779L240.231,182.779z" />
      <path d="M284.183,202.432c0,1.407,0,2.908,1.594,2.908c0.328,0,0.75-0.047,1.313-0.141v1.5c-0.517,0.095-0.985,0.188-1.455,0.188c-2.813,0-3.235-1.548-3.235-3.519v-1.267h-0.094c-1.125,2.861-4.361,5.349-8.959,5.349c-4.55,0-8.066-1.736-8.066-6.802c0-5.629,4.878-6.801,8.865-7.131c7.973-0.562,8.301-1.078,8.301-5.018c0-1.079-1.219-4.736-6.707-4.736c-4.314,0-7.176,2.25-7.41,6.424h-1.782c0.234-5.299,3.519-7.973,9.192-7.973c4.222,0,8.443,1.313,8.443,6.285V202.432L284.183,202.432z M282.397,193.191c-1.405,1.596-5.252,1.408-8.724,1.877c-4.221,0.469-6.612,1.97-6.612,5.58c0,2.908,2.109,5.254,6.332,5.254c8.113,0,9.004-6.941,9.004-8.209V193.191z" />
      <path d="M300.552,184.328h-5.253v16.838c0,3.893,1.829,4.268,5.206,4.174v1.549c-3.658,0.233-7.177-0.283-6.988-5.723v-16.838h-4.455v-1.549h4.455v-7.504h1.782v7.504h5.253V184.328z" />
      <path d="M306.087,178.23v-4.832h1.782v4.832H306.087z M306.087,206.889v-24.109h1.782v24.109H306.087z" />
      <path d="M325.317,182.217c7.082,0,11.068,5.77,11.068,12.617s-3.986,12.617-11.068,12.617c-7.083,0-11.069-5.77-11.069-12.617S318.234,182.217,325.317,182.217z M325.317,205.902c6.051,0,9.286-5.301,9.286-11.068c0-5.77-3.235-11.068-9.286-11.068s-9.286,5.299-9.286,11.068S319.268,205.902,325.317,205.902z" />
      <path d="M342.391,182.779h1.783v5.16h0.094c1.22-3.611,4.877-5.724,8.631-5.724c8.488,0,8.583,6.802,8.583,9.757v14.914h-1.782v-15.242c0-2.486-0.282-7.881-6.849-7.881c-5.394,0-8.677,4.176-8.677,10.086v13.037h-1.783V182.779z" />
      <path d="M386.341,202.432c0,1.407,0,2.908,1.595,2.908c0.328,0,0.75-0.047,1.313-0.141v1.5c-0.516,0.095-0.985,0.188-1.454,0.188c-2.813,0-3.236-1.548-3.236-3.519v-1.267h-0.094c-1.126,2.861-4.362,5.349-8.958,5.349c-4.55,0-8.066-1.736-8.066-6.802c0-5.629,4.877-6.801,8.864-7.131c7.974-0.562,8.302-1.078,8.302-5.018c0-1.079-1.22-4.736-6.707-4.736c-4.314,0-7.177,2.25-7.41,6.424h-1.782c0.234-5.299,3.517-7.973,9.192-7.973c4.221,0,8.441,1.313,8.441,6.285V202.432L386.341,202.432z M384.559,193.191c-1.405,1.596-5.252,1.408-8.724,1.877c-4.221,0.469-6.614,1.97-6.614,5.58c0,2.908,2.111,5.254,6.332,5.254c8.114,0,9.006-6.941,9.006-8.209V193.191z" />
      <path d="M396.051,173.398v33.488h-1.782v-33.488H396.051z" />
    </svg>
  );
}

/** A photograph with a brand-blue wash, for banners behind text. */
export function Photo({ src, alt = '', className = '', wash = 'navy', position = 'center' }: { src: string; alt?: string; className?: string; wash?: 'navy' | 'none' | 'light'; position?: string }) {
  return (
    <span className={`relative block overflow-hidden ${className}`} aria-hidden={alt === '' ? true : undefined}>
      <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} loading="lazy" />
      {wash === 'navy' && <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,25,58,0.55),rgba(2,25,58,0.85))]" />}
      {wash === 'light' && <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(3,70,148,0.45))]" />}
    </span>
  );
}
