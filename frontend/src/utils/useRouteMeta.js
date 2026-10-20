/**
 * useRouteMeta.js — Tiny hook that fires setRouteMeta whenever the screen
 * or its relevant params change.
 *
 * Usage:
 *   useRouteMeta('TitleDetail', { item });
 *
 * The hook intentionally does not render anything; it's a side-effect-only
 * hook that runs in any screen that calls it.
 */
import { useEffect, useRef } from 'react';
import { setRouteMeta } from './seo';

export function useRouteMeta(screen, params) {
    const paramsRef = useRef(params || {});
    paramsRef.current = params || {};
    const screenRef = useRef(screen);
    screenRef.current = screen;

    const depKey = typeof screen === 'string'
        ? `${screen}:${params?.id || params?.slug || params?.code || params?.name || params?.title || params?.item?.id || params?.item?.slug || ''}`
        : `${screen?.title || ''}:${screen?.url || ''}:${screen?.description || ''}`;

    useEffect(() => {
        setRouteMeta(screenRef.current, paramsRef.current);
    }, [depKey]);
}
