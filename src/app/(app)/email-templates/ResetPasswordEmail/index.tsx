import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Tailwind,
} from '@react-email/components'

interface PasswordResetEmailProps {
  email: string
  resetUrl: string
}

const ResetPasswordEmail = (props: PasswordResetEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white max-w-[600px] mx-auto p-[32px] rounded-[8px]">
            <Section>
              <Text className="text-[24px] font-bold text-black mb-[24px] mt-0">
                Reset Your Password
              </Text>

              <Text className="text-[16px] text-gray-700 mb-[24px] mt-0">
                We received a request to reset the password for your account ({props.email}).
              </Text>

              <Text className="text-[16px] text-gray-700 mb-[32px] mt-0">
                Click the button below to reset your password:
              </Text>

              <Button
                href={props.resetUrl}
                className="bg-blue-600 text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
              >
                Reset Password
              </Button>

              <Text className="text-[14px] text-gray-600 mb-[24px] mt-[32px]">
                If you didn't request this password reset, you can safely ignore this email.
              </Text>

              <Text className="text-[14px] text-gray-600 mb-0 mt-0">
                This link will expire in 24 hours for security reasons.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default ResetPasswordEmail
