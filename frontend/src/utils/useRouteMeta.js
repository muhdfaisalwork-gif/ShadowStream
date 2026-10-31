/**
 * useRouteMeta.js — Tiny hook that fires setRouteMeta whenever the screen
 * or its relevant params change or when the screen regains navigation focus.
 *
 * Usage:
 *   useRouteMeta('TitleDetail', { item });
 *
 * The hook intentionally does not render anything; it's a side-effect-only
 * hook that runs in any screen that calls it.
 */
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { setRouteMeta } from './seo';

export function useRouteMeta(screen, params) {
    let isFocused = true;
    try {
        isFocused = useIsFocused();
    } catch (_) {
        isFocused = true;
    }
    const paramsRef = useRef(params || {});
    paramsRef.current = params || {};
    const screenRef = useRef(screen);
    screenRef.current = screen;

    const depKey = typeof screen === 'string'
        ? `${screen}:${params?.id || params?.slug || params?.code || params?.name || params?.title || params?.item?.id || params?.item?.slug || ''}`
        : `${screen?.title || ''}:${screen?.url || ''}:${screen?.description || ''}`;

    useEffect(() => {
        if (isFocused) {
            setRouteMeta(screenRef.current, paramsRef.current);
        }
    }, [depKey, isFocused]);
}
