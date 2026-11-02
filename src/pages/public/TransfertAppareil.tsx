import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { deviceTransferService } from "../../services/deviceTransferService";
import { Paper, Title, Text, Group, Stack, Button, Loader, ThemeIcon } from "@mantine/core";

export default function TransfertAppareil() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transferData, setTransferData] = useState<any>(null);
  const [actionDone, setActionDone] = useState(false);
  const [actionType, setActionType] = useState<"accepted" | "rejected" | "">("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setError("Lien invalide. Aucun token de transfert trouvé."); setLoading(false); return; }

    deviceTransferService.getByToken(token)
      .then((res) => {
        if (res.success && res.data) {
          setTransferData(res.data);
        } else {
          setError(res.message || "Cette demande de transfert n'est plus valide.");
        }
      })
      .catch((e: any) => setError(e.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!user) { navigate("/login"); return; }
    setProcessing(true);
    try {
      const res = await deviceTransferService.accept(token!);
      if (res.success) {
        setActionDone(true);
        setActionType("accepted");
      } else {
        toast.error(res.message || "Erreur lors de l'acceptation");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Erreur de connexion");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const res = await deviceTransferService.reject(token!);
      if (res.success) {
        setActionDone(true);
        setActionType("rejected");
      } else {
        toast.error(res.message || "Erreur lors du refus");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Erreur de connexion");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgMain flex items-center justify-center">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Chargement de la demande...</Text>
        </Stack>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bgMain flex items-center justify-center p-4">
        <Paper p="xl" radius="xl" className="max-w-md w-full text-center" withBorder>
          <ThemeIcon size={60} radius="xl" variant="light" color="red" mx="auto">
            <i className="ph ph-warning-circle text-2xl" />
          </ThemeIcon>
          <Title order={4} mt="md" mb="xs">Lien invalide</Title>
          <Text c="dimmed" size="sm">{error}</Text>
          <Button fullWidth radius="xl" mt="lg" onClick={() => navigate("/")}>
            Retour à l'accueil
          </Button>
        </Paper>
      </div>
    );
  }

  if (actionDone) {
    return (
      <div className="min-h-screen bg-bgMain flex items-center justify-center p-4">
        <Paper p="xl" radius="xl" className="max-w-md w-full text-center" withBorder>
          <ThemeIcon size={60} radius="xl" variant="light" color={actionType === "accepted" ? "green" : "gray"} mx="auto">
            <i className={`${actionType === "accepted" ? "ph ph-check" : "ph ph-x"} text-2xl`} />
          </ThemeIcon>
          <Title order={4} mt="md" mb="xs">
            {actionType === "accepted" ? "Transfert accepté !" : "Transfert refusé"}
          </Title>
          <Text c="dimmed" size="sm">
            {actionType === "accepted"
              ? "L'appareil vous appartient désormais sur DocMaster."
              : "Le transfert a été refusé."}
          </Text>
          <Button fullWidth radius="xl" mt="lg" onClick={() => navigate(user ? "/mes-appareils" : "/")}>
            {user ? "Voir mes appareils" : "Retour à l'accueil"}
          </Button>
        </Paper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgMain flex items-center justify-center p-4">
      <Paper p="xl" radius="xl" className="max-w-md w-full" withBorder>
        <Stack align="center" gap="md" mb="lg">
          <ThemeIcon size={70} radius="xl" variant="light" color="primary">
            <i className="ph ph-arrows-left-right text-3xl" />
          </ThemeIcon>
          <Title order={4} ta="center">Transfert d'appareil</Title>
        </Stack>

        {transferData?.from_user && (
          <Text size="sm" ta="center" mb="md">
            <strong>{transferData.from_user.prenom} {transferData.from_user.nom}</strong> souhaite vous transférer un appareil.
          </Text>
        )}

        {transferData?.device && (
          <Paper p="md" radius="lg" className="bg-gray-50" mb="lg">
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" variant="light" color="gray">
                <i className="ph ph-device-mobile" />
              </ThemeIcon>
              <div>
                <Text fw={700}>{transferData.device.brand} {transferData.device.model}</Text>
                <Text size="xs" c="dimmed">{transferData.device.category || "Appareil"}</Text>
              </div>
            </Group>
          </Paper>
        )}

        {!user ? (
          <Stack gap="sm">
            <Text size="sm" c="dimmed" ta="center">Connectez-vous pour accepter ou refuser ce transfert.</Text>
            <Button fullWidth radius="xl" onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/transfert-appareil?token=${token}`)}`)}>
              Se connecter
            </Button>
          </Stack>
        ) : (
          <Stack gap="sm">
            <Button fullWidth radius="xl" color="green" loading={processing} onClick={handleAccept}>
              <i className="ph ph-check mr-1" /> Accepter le transfert
            </Button>
            <Button fullWidth radius="xl" variant="outline" color="red" loading={processing} onClick={handleReject}>
              <i className="ph ph-x mr-1" /> Refuser
            </Button>
          </Stack>
        )}
      </Paper>
    </div>
  );
}
