const P: Record<string, string> = {
  home: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  bell: 'M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  plus: 'M12 5v14M5 12h14',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z',
  ref: 'M4 12a8 8 0 0113-6l3 3M20 4v5h-5M20 12a8 8 0 01-13 6l-3-3M4 20v-5h5',
  chat: 'M4 5h16v11H9l-5 4z',
  bm: 'M6 3h12v18l-6-4-6 4z',
  share: 'M14 5l6 6-6 6v-4c-6 0-9 2-10 6 0-7 4-11 10-11z',
  x: 'M6 6l12 12M18 6L6 18',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-4 3-6 7-6s7 2 7 6M17 4a3.5 3.5 0 010 7M18 14c3 .5 4 2.5 4 6',
  ok: 'M5 12l5 5 9-10',
}
export function Icon({ n }: { n: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n]} />
    </svg>
  )
}
