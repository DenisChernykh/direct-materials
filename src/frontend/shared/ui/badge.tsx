/** @jsxImportSource react */
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const badgeVariants = cva(
  'inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted text-muted-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
        ghost: 'border-transparent text-muted-foreground',
        link: 'border-transparent text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      { className: cn(badgeVariants({ variant }), className) },
      props,
    ),
    render,
    state: { slot: 'badge', variant },
  })
}

export { badgeVariants }
