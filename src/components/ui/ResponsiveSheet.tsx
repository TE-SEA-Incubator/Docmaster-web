import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { ActionIcon, Drawer, Group, Modal, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

interface ResponsiveSheetProps {
  opened: boolean;
  onClose: () => void;
  closeLabel: string;
  title: string;
  subtitle?: ReactNode;
  progress?: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  resetKey?: string | number;
  children: ReactNode;
  desktopSize?: string | number;
}

export default function ResponsiveSheet({
  opened,
  onClose,
  closeLabel,
  title,
  subtitle,
  progress,
  footer,
  onBack,
  backLabel,
  resetKey,
  children,
  desktopSize = 640,
}: ResponsiveSheetProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  const column = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--mantine-color-body)",
      }}
    >
      <div style={{ flexShrink: 0, padding: isMobile ? "6px 16px 10px" : "20px 24px 12px" }}>
        {isMobile && (
          <span
            style={{
              display: "block",
              width: 44,
              height: 4,
              borderRadius: 99,
              background: "var(--mantine-color-gray-4)",
              margin: "0 auto 10px",
            }}
          />
        )}
        <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
          {onBack ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onBack}
              aria-label={backLabel}
              radius="md"
              styles={{ root: { width: 44, height: 44, flexShrink: 0 } }}
            >
              <i className="fa-solid fa-chevron-left" />
            </ActionIcon>
          ) : (
            <span style={{ width: 4, flexShrink: 0 }} />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <Title order={2} className="font-bricolage" fz={isMobile ? 17 : 19} style={{ lineHeight: 1.3 }}>
              {title}
            </Title>
            {subtitle && <div style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>

          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onClose}
            aria-label={closeLabel}
            radius="md"
            styles={{ root: { width: 44, height: 44, flexShrink: 0 } }}
          >
            <i className="fa-solid fa-xmark" />
          </ActionIcon>
        </Group>

        {progress && <div style={{ marginTop: isMobile ? 12 : 16 }}>{progress}</div>}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          padding: isMobile ? "4px 16px 16px" : "4px 24px 20px",
        }}
      >
        {children}
      </div>

      {footer && (
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--mantine-color-default-border)",
            padding: isMobile ? "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)" : "14px 24px",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        size="92%"
        offset={0}
        padding={0}
        radius={0}
        withCloseButton={false}
        closeOnClickOutside={false}
        lockScroll
        styles={{
          content: {
            display: "flex",
            flexDirection: "column",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          },
          body: {
            padding: 0,
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        {column}
      </Drawer>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={desktopSize}
      padding={0}
      radius={0}
      withCloseButton={false}
      styles={{
        content: {
          display: "flex",
          flexDirection: "column",
          maxHeight: "88dvh",
          borderRadius: 16,
          overflow: "hidden",
        },
        body: {
          padding: 0,
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {column}
    </Modal>
  );
}
