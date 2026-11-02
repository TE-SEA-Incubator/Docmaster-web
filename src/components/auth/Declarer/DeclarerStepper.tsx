import { Stepper, Paper } from "@mantine/core";
import { useI18n } from "../../../context/I18nContext";

interface DeclarerStepperProps {
  active: number;
  isMobile: boolean;
  onStepClick: (step: number) => void;
}

/**
 * 5-step progress bar for the declaration flow.
 * - Step 1: Owner
 * - Step 2: Documents
 * - Step 3: Details
 * - Step 4: Location
 * - Step 5: Contact
 *
 * Users can only jump backwards (validated by `active > s`).
 */
export default function DeclarerStepper({ active, isMobile, onStepClick }: DeclarerStepperProps) {
  const { t } = useI18n();
  return (
    <Paper
      radius="lg"
      p={{ base: "sm", sm: "md" }}
      mb="md"
      withBorder
      style={{ background: "white" }}
    >
      <Stepper
        active={active}
        onStepClick={(s) => active > s && onStepClick(s)}
        allowNextStepsSelect={false}
        size={isMobile ? "xs" : "sm"}
        iconSize={isMobile ? 24 : 32}
        completedIcon={<i className="ph ph-check" style={{ fontSize: 11 }} />}
        styles={{
          stepLabel: { fontSize: isMobile ? 11 : 12 },
          stepDescription: { fontSize: isMobile ? 10 : 11 },
          separator: { marginLeft: isMobile ? -2 : 0, marginRight: isMobile ? -2 : 0 },
        }}
      >
        <Stepper.Step label={t("declarer_step_1")} description={t("declarer_in_progress")} icon={<i className="ph ph-user" style={{ fontSize: 11 }} />} />
        <Stepper.Step label={t("declarer_step_2")} icon={<i className="ph ph-file" style={{ fontSize: 11 }} />} />
        <Stepper.Step label={t("declarer_step_3")} icon={<i className="ph ph-info" style={{ fontSize: 11 }} />} />
        <Stepper.Step label={t("declarer_step_4")} icon={<i className="ph ph-map-pin" style={{ fontSize: 11 }} />} />
        <Stepper.Step label={t("declarer_step_5")} icon={<i className="ph ph-phone" style={{ fontSize: 11 }} />} />
      </Stepper>
    </Paper>
  );
}
