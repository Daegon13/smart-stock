export type TourStep = {
  id: string;
  title: string;
  description: string;
  path: string;
  target: string;
};

export function getTourSteps(t: (key: string) => string): TourStep[] {
  return [
    {
      id: "dashboard",
      title: t("tour.1.title"),
      description: t("tour.1.desc"),
      path: "/today",
      target: '[data-tour="dashboard"]'
    },
    {
      id: "import",
      title: t("tour.2.title"),
      description: t("tour.2.desc"),
      path: "/import",
      target: '[data-tour="import"]'
    },
    {
      id: "reconcile",
      title: t("tour.3.title"),
      description: t("tour.3.desc"),
      path: "/reconcile",
      target: '[data-tour="reconcile"]'
    },
    {
      id: "stock",
      title: t("tour.4.title"),
      description: t("tour.4.desc"),
      path: "/stock",
      target: '[data-tour="stock"]'
    },
    {
      id: "orders",
      title: t("tour.5.title"),
      description: t("tour.5.desc"),
      path: "/orders",
      target: '[data-tour="orders"]'
    },
    {
      id: "movements",
      title: t("tour.6.title"),
      description: t("tour.6.desc"),
      path: "/movements",
      target: '[data-tour="movements"]'
    }
  ];
}
