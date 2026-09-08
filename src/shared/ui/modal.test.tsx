import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './modal'

describe('Modal', () => {
  it('portals the dialog to the document body above nested stacking contexts', () => {
    const host = document.createElement('div')
    document.body.append(host)
    render(
      <div data-testid="stacking-context">
        <Modal title="Policy preview" description="Review impact" onClose={vi.fn()}>
          <button>Confirm</button>
        </Modal>
      </div>,
      { container: host },
    )

    const dialog = screen.getByRole('dialog', { name: 'Policy preview' })
    expect(dialog.parentElement?.parentElement).toBe(document.body)
    expect(screen.getByTestId('stacking-context')).not.toContainElement(dialog)
  })

  it('keeps focus in a textarea when its controlled value rerenders the modal', () => {
    const { rerender } = render(
      <Modal title="Suppress" description="Provide a reason" onClose={() => undefined}>
        <textarea aria-label="Reason" value="" onChange={() => undefined} />
        <input aria-label="Expires at" />
      </Modal>,
    )

    const reason = screen.getByRole('textbox', { name: 'Reason' })
    expect(reason).toHaveFocus()

    fireEvent.change(reason, { target: { value: 'Reviewing' } })
    rerender(
      <Modal title="Suppress" description="Provide a reason" onClose={() => undefined}>
        <textarea aria-label="Reason" value="Reviewing" onChange={() => undefined} />
        <input aria-label="Expires at" />
      </Modal>,
    )

    expect(reason).toHaveFocus()
  })
})
