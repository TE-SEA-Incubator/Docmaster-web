import { useState } from "react";
import { Paper, Text, Title, Badge, Button, Group, ActionIcon } from "@mantine/core";
import PaymentModal from "../modals/PaymentModal";

interface PromoBannerProps {
  plan: {
    id: string;
    name: string;
    price: number;
    original_price?: number | null;
    duration_months: number;
    features: Record<string, unknown>;
  };
  onSubscribe: (method: "orange" | "mtn" | "points", phone: string) => Promise<void>;
  onDismiss?: () => void;
  processing?: boolean;
  pollingStatus?: string | null;
}

export default function PromoBanner({ plan, onSubscribe, onDismiss, processing, pollingStatus }: PromoBannerProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [payError, setPayError] = useState("");

  const originalPrice = plan.original_price ?? 0;
  const discountPct = originalPrice > 0 ? Math.round((1 - plan.price / originalPrice) * 100) : 0;

  const handlePay = async (method: "orange" | "mtn" | "points", phone: string) => {
    setPayError("");
    try {
      await onSubscribe(method, phone);
      setShowPayment(false);
    } catch (err: any) {
      setPayError(err.message || "Erreur de paiement");
    }
  };

  return (
    <>
      <Paper radius={20} p={{ base: "sm", sm: "md" }} style={{ background: "#0284c7", position: "relative", overflow: "hidden" }} shadow="xl">
        <div className="absolute top-2 right-2 w-20 sm:w-24 h-20 sm:h-24 bg-white/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-16 sm:w-20 h-16 sm:h-20 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />

        <img
          src="/src/assets/images/promo.png"
          alt=""
          className="absolute bottom-0 right-0 h-[90%] sm:h-full w-auto object-contain pointer-events-none select-none"
        />

        {onDismiss && (
          <ActionIcon
            onClick={onDismiss}
            variant="subtle"
            color="gray"
            size="sm"
            radius="xl"
            className="absolute top-3 right-3 z-20"
            style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.7)" }}
            aria-label="Fermer"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </ActionIcon>
        )}

        <div className="relative z-10 max-w-[60%] sm:max-w-[65%]">
          <Group gap={8} mb={8}>
            <Badge color="red" variant="filled" size="sm" radius="xl" className="uppercase" styles={{ label: { fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" } }}>
              -{discountPct}%
            </Badge>
            <Text c="white.6" fw={500} size="xs" className="uppercase" style={{ fontSize: 11, letterSpacing: "0.05em" }}>
              Offre limitée
            </Text>
          </Group>

          <Title order={3} fw={900} c="white" ff="Bricolage Grotesque" mb={4}>
            VIP {plan.duration_months} mois
          </Title>
          <Text c="white.6" size="xs" mb="sm" style={{ fontSize: 11 }}>
            Accès à toutes les fonctionnalités VIP
          </Text>

          <Group gap="sm" mb="sm">
            <Text c="white.4" fw={700} td="line-through" style={{ fontSize: 14 }}>
              {originalPrice.toLocaleString("fr-FR")} XAF
            </Text>
            <Text c="white" fw={900} style={{ fontSize: 22 }}>
              {plan.price.toLocaleString("fr-FR")} <Text component="span" c="white.6" fw={700} size="sm">XAF</Text>
            </Text>
          </Group>

          <Group gap={6} mb="sm" wrap="wrap">
            {[
              { icon: "fa-file-circle-check", label: "5 types doc" },
              { icon: "fa-box-open", label: "7 objets" },
              { icon: "fa-bell", label: "Alertes SMS" },
              { icon: "fa-location-dot", label: "Géo-tracking" },
              { icon: "fa-circle-check", label: "Badge vérifié" },
            ].map((f) => (
              <Badge key={f.label} variant="filled" size="sm" radius="xl" p={0} style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 500 }}>
                <Group gap={4}>
                  <i className={`fa-solid ${f.icon} text-[7px] sm:text-[8px]`} /> {f.label}
                </Group>
              </Badge>
            ))}
          </Group>

          <Button
            onClick={() => setShowPayment(true)}
            disabled={processing}
            variant="filled"
            radius="lg"
            size="md"
            fw={900}
            style={{ background: "white", color: "#0284c7" }}
            leftSection={processing ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-crown" />}
          >
            {processing ? "Activation..." : "Activer mon VIP"}
          </Button>
        </div>
      </Paper>

      {showPayment && (
        <PaymentModal
          isOpen={showPayment && !pollingStatus}
          onClose={() => setShowPayment(false)}
          onPay={handlePay}
          amount={plan.price}
          title="Activer l'offre VIP"
          description={`VIP ${plan.duration_months} mois — ${plan.price.toLocaleString("fr-FR")} XAF`}
          processing={processing || !!pollingStatus}
          error={payError}
          submitLabel="Activer"
        />
      )}
    </>
  );
}
