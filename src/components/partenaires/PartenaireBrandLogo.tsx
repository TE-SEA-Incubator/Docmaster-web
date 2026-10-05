import { Typography } from "antd";
import { partenairePalette } from "../../theme/partenaires";
import launcherIcon from "../../assets/images/launcher_icon.png";

interface PartenaireBrandLogoProps {
  size?: "md" | "lg";
  centered?: boolean;
}

export default function PartenaireBrandLogo({ size = "md", centered = true }: PartenaireBrandLogoProps) {
  const iconSize = size === "lg" ? 56 : 48;
  const titleSize = size === "lg" ? 26 : 22;
  const partnerSize = size === "lg" ? 22 : 18;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap: 12,
      }}
    >
      <img
        src={launcherIcon}
        alt="DocMaster"
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: size === "lg" ? 14 : 12,
          objectFit: "cover",
          flexShrink: 0,
          boxShadow: "0 4px 14px rgba(18, 52, 60, 0.18)",
        }}
      />
      <div style={{ lineHeight: 1.15 }}>
        <Typography.Text
          style={{
            display: "block",
            fontSize: titleSize,
            fontWeight: 800,
            color: partenairePalette.greenDark,
            fontFamily: "Poppins, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          DocMaster
        </Typography.Text>
        <Typography.Text
          style={{
            display: "block",
            fontSize: partnerSize,
            fontWeight: 700,
            color: partenairePalette.primary,
            fontFamily: "Poppins, sans-serif",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Partenaire
        </Typography.Text>
      </div>
    </div>
  );
}
