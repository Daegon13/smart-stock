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
      path: "/dashboard",
      target: '[data-tour="dashboard"]'
    },
    {
      id: "login-future",
      title: t("tour.2.title"),
      description: t("tour.2.desc"),
      path: "/dashboard",
      target: '[data-tour="login-future"]'
    },
    {
      id: "import",
      title: t("tour.3.title"),
      description: t("tour.3.desc"),
      path: "/import",
      target: '[data-tour="import"]'
    },
    {
      id: "tickets",
      title: t("tour.4.title"),
      description: t("tour.4.desc"),
      path: "/reconcile",
      target: '[data-tour="tickets"]'
    },
    {
      id: "reconcile",
      title: t("tour.5.title"),
      description: t("tour.5.desc"),
      path: "/reconcile",
      target: '[data-tour="reconcile"]'
    },
    {
      id: "stock",
      title: t("tour.6.title"),
      description: t("tour.6.desc"),
      path: "/stock",
      target: '[data-tour="stock"]'
    },
    {
      id: "orders",
      title: t("tour.7.title"),
      description: t("tour.7.desc"),
      path: "/orders",
      target: '[data-tour="orders"]'
    },
    {
      id: "movements",
      title: t("tour.8.title"),
      description: t("tour.8.desc"),
      path: "/movements",
      target: '[data-tour="movements"]'
    }
  ];
}
