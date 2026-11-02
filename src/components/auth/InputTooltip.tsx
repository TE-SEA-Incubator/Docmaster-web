import { useState } from 'react';
import { Center, PasswordInput, Text, TextInput, Tooltip, TextInputProps, PasswordInputProps } from '@mantine/core';

interface InputTooltipProps extends TextInputProps {
  type?: 'text' | 'password';
  tooltipLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function InputTooltip({ 
  type = 'text', 
  tooltipLabel, 
  onFocus, 
  onBlur, 
  ...props 
}: InputTooltipProps) {
  
  if (type === 'password') {
    const [opened, setOpened] = useState(false);
    
    return (
      <Tooltip
        label={tooltipLabel || 'Password requirement info'}
        position="bottom-start"
        withArrow
        opened={opened}
        withinPortal
      >
        <PasswordInput
          {...(props as PasswordInputProps)}
          onFocus={() => { setOpened(true); if (onFocus) onFocus(); }}
          onBlur={() => { setOpened(false); if (onBlur) onBlur(); }}
        />
      </Tooltip>
    );
  }

  const rightSection = (
    <Tooltip
      label={tooltipLabel || 'Information'}
      position="top-end"
      withArrow
    >
      <Text component="div" c="dimmed" style={{ cursor: 'help' }}>
        <Center>
          <i className="ph ph-info" style={{ fontSize: '18px' }} />
        </Center>
      </Text>
    </Tooltip>
  );

  return (
    <TextInput
      {...props}
      rightSection={rightSection}
    />
  );
}
