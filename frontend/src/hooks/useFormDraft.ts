import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export function formDraftKey(scope: string, userId?: number) {
  return `reftrack:form-draft:v1:${userId ?? 'guest'}:${scope}`
}

type DraftResult<T> = {
  value: T
  found: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function selectedValues<T extends object>(value: T, fields: readonly (keyof T)[]) {
  const selected: Record<string, unknown> = {}
  fields.forEach((field) => { selected[String(field)] = value[field] })
  return selected
}

function restoreValue(defaultValue: unknown, savedValue: unknown): DraftResult<unknown> {
  if (defaultValue === null) {
    return savedValue === null || typeof savedValue === 'number'
      ? { value: savedValue, found: true }
      : { value: defaultValue, found: false }
  }
  if (typeof savedValue !== typeof defaultValue) return { value: defaultValue, found: false }
  if (isRecord(defaultValue)) {
    if (!isRecord(savedValue)) return { value: defaultValue, found: false }
    const restored = { ...defaultValue }
    let found = false
    Object.keys(defaultValue).forEach((key) => {
      if (!(key in savedValue)) return
      const result = restoreValue(defaultValue[key], savedValue[key])
      if (result.found) {
        restored[key] = result.value
        found = true
      }
    })
    return { value: restored, found }
  }
  if (Array.isArray(defaultValue)) {
    return Array.isArray(savedValue)
      ? { value: savedValue, found: true }
      : { value: defaultValue, found: false }
  }
  return { value: savedValue, found: true }
}

function readDraft<T extends object>(key: string, initialValue: T, fields: readonly (keyof T)[]): DraftResult<T> {
  let serialized: string | null
  try {
    serialized = localStorage.getItem(key)
  } catch (error) {
    console.error(`Unable to read RefTrack form draft "${key}".`, error)
    return { value: initialValue, found: false }
  }
  if (serialized === null) return { value: initialValue, found: false }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch (error) {
    console.error(`RefTrack form draft "${key}" contains invalid JSON.`, error)
    return { value: initialValue, found: false }
  }
  if (!isRecord(parsed)) {
    console.error(`RefTrack form draft "${key}" has an invalid shape.`)
    return { value: initialValue, found: false }
  }

  const restored = { ...initialValue } as Record<string, unknown>
  let found = false
  fields.forEach((field) => {
    const name = String(field)
    if (!(name in parsed)) return
    const result = restoreValue(restored[name], parsed[name])
    if (result.found) {
      restored[name] = result.value
      found = true
    }
  })
  return { value: restored as T, found }
}

export function useFormDraft<T extends object>(
  key: string,
  initialValue: T,
  fields: readonly (keyof T)[],
): [T, Dispatch<SetStateAction<T>>, (nextValue?: T) => void, boolean] {
  const [initialDraft] = useState(() => readDraft(key, initialValue, fields))
  const [value, setValue] = useState(initialDraft.value)
  const [hasDraft, setHasDraft] = useState(initialDraft.found)
  const activeKey = useRef(key)
  const skipWrite = useRef(true)

  useEffect(() => {
    if (activeKey.current !== key) {
      activeKey.current = key
      const draft = readDraft(key, initialValue, fields)
      setValue(draft.value)
      setHasDraft(draft.found)
      skipWrite.current = true
      return
    }
    if (skipWrite.current) {
      skipWrite.current = false
      return
    }

    const current = selectedValues(value, fields)
    const defaults = selectedValues(initialValue, fields)
    try {
      if (JSON.stringify(current) === JSON.stringify(defaults)) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(current))
      }
    } catch (error) {
      console.error(`Unable to save RefTrack form draft "${key}".`, error)
    }
  }, [fields, initialValue, key, value])

  const clearDraft = useCallback((nextValue?: T) => {
    try {
      localStorage.removeItem(activeKey.current)
    } catch (error) {
      console.error(`Unable to clear RefTrack form draft "${activeKey.current}".`, error)
    }
    setHasDraft(false)
    if (nextValue !== undefined) {
      skipWrite.current = true
      setValue(nextValue)
    }
  }, [])

  return [value, setValue, clearDraft, hasDraft]
}
