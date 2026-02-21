export type TourStep = {
  id: string;
  title: string;
  description: string;
  path: string;
  target: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    title: "1) Dashboard",
    description: "Acá ves el estado general del local y las acciones rápidas.",
    path: "/dashboard",
    target: '[data-tour="dashboard"]'
  },
  {
    id: "import",
    title: "2) Importar",
    description: "Subí ventas/tickets para alimentar el stock y el historial.",
    path: "/import",
    target: '[data-tour="import"]'
  },
  {
    id: "tickets",
    title: "3) Tickets",
    description: "Entrá a conciliación para resolver líneas sin match y guardar alias.",
    path: "/reconcile",
    target: '[data-tour="tickets"]'
  },
  {
    id: "reconcile",
    title: "4) Conciliar",
    description: "Asigná productos una vez y el sistema aprende para próximas importaciones.",
    path: "/reconcile",
    target: '[data-tour="reconcile"]'
  },
  {
    id: "stock",
    title: "5) Stock inteligente",
    description: "Revisá sugerencias de reposición y prioridades de compra.",
    path: "/stock",
    target: '[data-tour="stock"]'
  },
  {
    id: "orders",
    title: "6) Órdenes",
    description: "Convertí sugerencias en órdenes de compra y seguimiento de recepción.",
    path: "/orders",
    target: '[data-tour="orders"]'
  },
  {
    id: "movements",
    title: "7) Movimientos",
    description: "Registrá ventas, compras y ajustes para mantener stock confiable.",
    path: "/movements",
    target: '[data-tour="movements"]'
  }
];
