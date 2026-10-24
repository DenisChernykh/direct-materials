// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogTitle,
  Button,
  Field,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../src/frontend/shared/ui'

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
})

async function render(element: React.ReactNode) {
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
  await act(async () => {
    root?.render(element)
  })
}

describe('adapted shared UI primitives', () => {
  it('keeps the starter loading contract and accessible name', async () => {
    await render(
      <Button isLoading loadingLabel="Сохраняем">
        Сохранить
      </Button>,
    )
    const button = document.querySelector('button')
    expect(button?.dataset.slot).toBe('button')
    expect(button?.disabled).toBe(true)
    expect(button?.getAttribute('aria-busy')).toBe('true')
    expect(button?.getAttribute('aria-label')).toBe('Сохраняем')
    expect(document.querySelector('[data-slot="spinner"]')).not.toBeNull()
  })

  it('connects Field label, description, and error IDs to its control', async () => {
    await render(
      <Field
        id="campaign-name"
        label="Название"
        hint="Короткое имя"
        error="Введите название"
      >
        <Input />
      </Field>,
    )
    const input = document.querySelector('input')
    expect(document.querySelector('label')?.getAttribute('for')).toBe(
      'campaign-name',
    )
    expect(input?.id).toBe('campaign-name')
    expect(input?.getAttribute('aria-invalid')).toBe('true')
    expect(input?.getAttribute('aria-describedby')).toBe(
      'campaign-name-hint campaign-name-error',
    )
    expect(document.querySelector('[data-slot="field-error"]')?.id).toBe(
      'campaign-name-error',
    )
  })

  it('traps focus, closes on Escape, and restores focus to the trigger', async () => {
    await render(
      <AlertDialog>
        <AlertDialogTrigger>Запустить</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Подтвердить</AlertDialogTitle>
          <AlertDialogDescription>Массовый ответ</AlertDialogDescription>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={() => undefined}>
            Продолжить
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    )
    const trigger = document.querySelector(
      '[data-slot="alert-dialog-trigger"]',
    ) as HTMLButtonElement
    trigger.focus()
    await act(async () => {
      trigger.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-labelledby')).toBe(
      document.querySelector('[data-slot="alert-dialog-title"]')?.id,
    )
    const action = document.querySelector(
      '[data-slot="alert-dialog-action"]',
    ) as HTMLButtonElement
    const cancel = document.querySelector(
      '[data-slot="alert-dialog-cancel"]',
    ) as HTMLButtonElement
    expect(document.activeElement).toBe(cancel)
    await act(async () => {
      dialog?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          bubbles: true,
          cancelable: true,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    action.focus()
    expect(document.activeElement).toBe(action)
    await act(async () => {
      dialog?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          code: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    cancel.focus()
    expect(document.activeElement).toBe(cancel)
    await act(async () => {
      action.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps the closed Sheet content out of the tab order and restores focus', async () => {
    await render(
      <Sheet>
        <SheetTrigger render={<Button>Открыть меню</Button>} />
        <SheetContent side="left">
          <SheetTitle className="sr-only">Навигация</SheetTitle>
          <SheetDescription className="sr-only">
            Навигация приложения
          </SheetDescription>
          <a href="/admin">Обзор</a>
          <button type="button">Действие</button>
        </SheetContent>
      </Sheet>,
    )
    const trigger = document.querySelector(
      '[data-slot="sheet-trigger"]',
    ) as HTMLButtonElement
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull()
    expect(document.querySelector('[data-slot="sheet-content"] a')).toBeNull()
    expect(trigger.tabIndex).toBe(0)

    trigger.focus()
    await act(async () => {
      trigger.click()
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    const content = document.querySelector(
      '[data-slot="sheet-content"]',
    ) as HTMLElement
    expect(content).not.toBeNull()
    const close = content.querySelector(
      '[data-slot="sheet-close"]',
    ) as HTMLButtonElement
    expect(close).not.toBeNull()
    expect(close.className).toContain('absolute')
    expect(close.className).not.toContain('relative')
    const firstFocusable = content.querySelector('a,button') as HTMLElement
    firstFocusable.focus()
    expect(content.contains(document.activeElement)).toBe(true)

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
