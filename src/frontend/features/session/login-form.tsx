/** @jsxImportSource react */
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { login } from '../../shared/api'
import { continueAfterLogin } from '../../shared/navigation'
import { queryClient } from '../../app/providers'
import {
  Button,
  InlineError,
  Input,
  Label,
  messageForError,
} from '../../shared/ui'

const loginSchema = z.object({ password: z.string().min(1, 'Введите пароль.') })
type LoginValues = z.infer<typeof loginSchema>

export function LoginForm({ next }: { next: string }) {
  const navigate = useNavigate()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const mutation = useMutation({
    mutationFn: (values: LoginValues) => login(values.password),
    onSuccess: (session) => {
      queryClient.setQueryData(['session'], session)
      continueAfterLogin(next, navigate, (target) =>
        window.location.assign(target),
      )
    },
  })
  const fieldError = form.formState.errors.password?.message
  return (
    <form
      className="mt-8 grid gap-5"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      {mutation.isError && (
        <InlineError message={messageForError(mutation.error)} />
      )}
      <Input
        id="username"
        name="username"
        type="text"
        value="owner"
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="username"
        className="sr-only"
      />
      <div className="grid gap-2">
        <Label htmlFor="password">Пароль владельца</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? 'password-error' : undefined}
          {...form.register('password')}
        />
        {fieldError && (
          <span
            className="text-xs text-destructive"
            id="password-error"
            role="alert"
          >
            {fieldError}
          </span>
        )}
      </div>
      <Button
        className="w-full"
        type="submit"
        isLoading={mutation.isPending}
        loadingLabel="Проверяем пароль"
      >
        {mutation.isPending ? 'Проверяем…' : 'Войти'}
      </Button>
    </form>
  )
}
