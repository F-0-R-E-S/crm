import { usePermissions } from '../hooks/usePermissions'

interface Props {
  permission?: string
  anyOf?: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PermissionGate({ permission, anyOf, children, fallback = null }: Props) {
  const { has, hasAny } = usePermissions()

  if (permission && !has(permission)) return <>{fallback}</>
  if (anyOf && !hasAny(...anyOf)) return <>{fallback}</>

  return <>{children}</>
}
