/** @jsxImportSource react */
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { Spinner } from './spinner'
import { cn } from './utils'

const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-xs font-semibold whitespace-nowrap shadow-sm transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90',
        outline:
          'border-border bg-card text-foreground hover:bg-muted hover:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'text-muted-foreground shadow-none hover:bg-muted hover:text-foreground',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/30',
      },
      size: {
        default: 'min-h-10 gap-2 px-4',
        sm: 'min-h-8 gap-1.5 px-3 text-[11px]',
        lg: 'min-h-11 gap-2 px-5',
        icon: 'size-9 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
    loadingLabel?: string
    'data-slot'?: string
  }

export function Button({
  isLoading,
  loadingLabel,
  children,
  disabled,
  'aria-label': ariaLabel,
  'data-slot': dataSlot = 'button',
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  const busy = Boolean(isLoading)
  const resolvedClassName = (state: ButtonPrimitive.State) =>
    cn(
      buttonVariants({ variant, size }),
      'relative',
      typeof className === 'function' ? className(state) : className,
    )

  return (
    <ButtonPrimitive
      {...props}
      data-slot={dataSlot}
      aria-busy={busy || undefined}
      aria-label={busy ? (loadingLabel ?? 'Загрузка') : ariaLabel}
      disabled={disabled || busy}
      className={resolvedClassName}
    >
      <span
        data-slot="button-content"
        className={cn('contents', busy && 'invisible')}
      >
        {children}
      </span>
      {busy && (
        <span
          data-slot="button-loading"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Spinner aria-hidden="true" />
        </span>
      )}
    </ButtonPrimitive>
  )
}

export { buttonVariants }
