import { useCallback, useEffect, useMemo, type DependencyList } from 'react'

export const useCallbackAsync = <T extends Function>(
  callback: T,
  depsOrErr?: DependencyList | ((err: any) => void),
  deps?: DependencyList
): T => {
  const depArr: DependencyList = useMemo(() => {
    let _deps: DependencyList = []
    if (Array.isArray(depsOrErr)) {
      _deps = [..._deps, ...depsOrErr]
    }
    if (Array.isArray(deps)) {
      _deps = [..._deps, ...deps]
    }
    return _deps
  }, [depsOrErr, deps])

  const hook = useCallback<any>(async (...args: any[]) => {
    try {
      await callback(...args)
    } catch (err) {
      if (typeof depsOrErr === 'function') {
        depsOrErr(err)
      } else {
        console.error('useCallback', err)
      }
    }
  }, depArr)

  return hook
}

declare const UNDEFINED_VOID_ONLY: unique symbol

type Destructor = () => void | { [UNDEFINED_VOID_ONLY]: never }

export const useEffectAsync = (
  effect: () => Promise<void>,
  depsOrDes: DependencyList | Destructor,
  depsOrErr?: DependencyList | ((err: any) => void),
  deps?: DependencyList
) => {
  const depArr = useMemo(() => {
    let _deps: DependencyList = []
    if (Array.isArray(depsOrDes)) {
      _deps = [..._deps, ...depsOrDes]
    }
    if (Array.isArray(depsOrErr)) {
      _deps = [..._deps, ...depsOrErr]
    }
    if (Array.isArray(deps)) {
      _deps = [..._deps, ...deps]
    }
    return _deps
  }, [deps, depsOrDes, depsOrErr])

  const hook = useEffect(() => {
    ;(async () => {
      try {
        await effect()
      } catch (err) {
        if (typeof depsOrErr === 'function') {
          depsOrErr(err)
        } else {
          console.info(err)
        }
      }
    })()

    return () => {
      if (typeof depsOrDes === 'function') {
        depsOrDes()
      }
    }
  }, depArr)

  return hook
}
