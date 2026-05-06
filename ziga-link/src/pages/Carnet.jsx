import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Carnet est désormais intégré dans la page Obeissance (Journal)
export default function Carnet() {
  const navigate = useNavigate();
  useEffect(() => {
navigate(createPageUrl("ActivitesDressage"), { replace: true });  }, []);
  return null;
}