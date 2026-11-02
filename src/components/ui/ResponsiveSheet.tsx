import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { ActionIcon, Group, Title } from "@mantine/core";
import { Dialog, DialogContent } from "./dialog";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[88vh] p-0"
        style={{ 
          width: typeof desktopSize === "number" ? `${desktopSize}px` : desktopSize,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
            background: "var(--mantine-color-body)",
          }}
        >
          <div style={{ flexShrink: 0, padding: "20px 24px 12px" }}>
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
                  <i className="ph ph-caret-left" />
                </ActionIcon>
              ) : (
                <span style={{ width: 4, flexShrink: 0 }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <Title order={2} className="font-bricolage" fz={19} style={{ lineHeight: 1.3 }}>
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
                <i className="ph ph-x" />
              </ActionIcon>
            </Group>

            {progress && <div style={{ marginTop: 16 }}>{progress}</div>}
          </div>

          <div
            ref={scrollRef}
            className="hide-scrollbar"
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              padding: "4px 24px 20px",
            }}
          >
            {children}
          </div>

          {footer && (
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--mantine-color-default-border)",
                padding: "14px 24px",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
