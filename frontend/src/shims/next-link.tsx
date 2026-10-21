import React from 'react'
import { Link as RouterLink } from 'react-router-dom'

export interface NextLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
  children?: React.ReactNode
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  passHref?: boolean
  prefetch?: boolean | 'none' | 'intent' | 'render'
  locale?: string | false
}

export const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, children, replace, prefetch: _prefetch, ...props }, ref) => {
    return (
      <RouterLink ref={ref} to={href} replace={replace} {...props}>
        {children}
      </RouterLink>
    )
  }
)

Link.displayName = 'NextLinkShim'

export default Link
