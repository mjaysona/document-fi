import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  size?: 'default' | 'sm' | 'md' | 'lg' | 'clear'
  variant?: 'default' | 'outline' | 'link' | 'ghost' | 'light'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, className, size, variant, ...props }, ref) => {
    void asChild
    void size
    void variant
    return <button className={className} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button }
