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

interface VerifyEmailProps {
  email: string
  verificationUrl: string
}

const VerifyEmail = (props: VerifyEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white max-w-[600px] mx-auto p-[32px] rounded-[8px]">
            <Section>
              <Text className="text-[24px] font-bold text-black mb-[24px] mt-0">
                Verify your account
              </Text>

              <Text className="text-[16px] text-gray-700 mb-[32px] mt-0">
                Click the button below to verify your account.
              </Text>

              <Button
                href={props.verificationUrl}
                className="bg-blue-600 text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
              >
                Verify my account
              </Button>

              <Text className="text-[14px] text-gray-600 mb-[24px] mt-[32px]">
                If you have not created an account, you can safely ignore this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default VerifyEmail
