import type { ReactNode } from "react";
import { Button } from "react-email";
import { styles } from "../styles";

type ActionButtonProps = {
  href: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
};

export function ActionButton({
  href,
  variant = "primary",
  children,
}: ActionButtonProps) {
  return (
    <div style={styles.buttonWrapper}>
      <Button
        href={href}
        style={variant === "primary" ? styles.button : styles.buttonSecondary}
      >
        {children}
      </Button>
    </div>
  );
}
