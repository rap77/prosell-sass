// Shared data for landing page sections

export const PRICING_PLANS = [
  {
    name: "Arranque",
    desc: "Para equipos que están empezando",
    price: "$0",
    priceUnit: "/ mes",
    note: "2% comisión por venta cerrada",
    badge: null,
    featured: false,
    cta: "Empezar gratis",
    features: [
      "Hasta 2 usuarios",
      "1 nicho activo",
      "Publicación en 2 canales",
      "Inbox unificado básico",
      "Dashboard de métricas esencial",
      "Soporte por email",
    ],
  },
  {
    name: "Crecimiento",
    desc: "Para equipos en expansión activa",
    price: "$299",
    priceUnit: "/ mes",
    note: "1.5% comisión por venta cerrada",
    badge: "Más popular",
    featured: true,
    cta: "Empezar ahora",
    features: [
      "Hasta 10 usuarios",
      "3 nichos activos",
      "Publicación en todos los canales",
      "Inbox unificado completo + IA",
      "Analytics avanzados por canal",
      "Soporte prioritario",
      "Integraciones nativas",
    ],
  },
  {
    name: "Enterprise",
    desc: "Para grupos con múltiples sucursales",
    price: "A medida",
    priceUnit: "",
    note: "Comisión negociada según volumen",
    badge: null,
    featured: false,
    cta: "Hablar con ventas",
    features: [
      "Usuarios ilimitados",
      "Nichos ilimitados",
      "API completa",
      "Account manager dedicado",
      "SLA garantizado",
      "Onboarding personalizado",
      "Integraciones enterprise",
    ],
  },
] as const;

export const TESTIMONIALS_3 = [
  {
    av: "MR",
    avBg: "linear-gradient(135deg,#0D1B6E,#1E5FD4)",
    quote:
      '"En el primer mes recuperamos el 40% de los leads que antes se perdían por falta de seguimiento. El inbox unificado cambió todo para nuestro equipo."',
    name: "Martín Rodríguez",
    role: "Gerente Comercial · Automotores del Norte",
    niche: "🚗 Vehículos",
  },
  {
    av: "SG",
    avBg: "linear-gradient(135deg,#1E5FD4,#4DB8FF)",
    quote:
      '"Publicamos en 6 portales a la vez sin tocar nada. Antes nos llevaba 2 horas por unidad. Ahora son 2 minutos y sin errores."',
    name: "Sofía García",
    role: "Directora de Operaciones · Grupo Motores SA",
    niche: "🚗 Vehículos",
  },
  {
    av: "LT",
    avBg: "linear-gradient(135deg,#4DB8FF,#0D1B6E)",
    quote:
      '"El dashboard de analytics nos mostró que Facebook convertía 2x más que AutoTrader. Movimos el presupuesto y el ROI se triplicó en 6 semanas."',
    name: "Lucas Torres",
    role: "CEO · TurboAutos",
    niche: "🚗 Vehículos",
  },
] as const;

export const TESTIMONIALS_2 = [
  {
    av: "CP",
    avBg: "linear-gradient(135deg,#22D3A0,#1E5FD4)",
    quote:
      '"Teníamos 3 personas respondiendo leads manualmente desde 4 plataformas distintas. Con ProSell son 2 personas, respuesta en menos de 60 segundos y el doble de cierres. No entiendo cómo trabajábamos antes."',
    name: "Carolina Pérez",
    role: "Coordinadora Comercial · AutoSelect",
    niche: "🚗 Vehículos",
  },
  {
    av: "JM",
    avBg: "linear-gradient(135deg,#F5A623,#1E5FD4)",
    quote:
      '"La visibilidad de pipeline que nos da ProSell es incomparable. Antes era todo en Excel y WhatsApp. Hoy sé exactamente dónde está cada deal, cuánto tiempo lleva en cada etapa y qué hacer para cerrarlo."',
    name: "Javier Molina",
    role: "Director General · Concesionaria Molina e Hijos",
    niche: "🚗 Vehículos",
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: "¿Necesito conocimientos técnicos para usar ProSell?",
    a: "No. ProSell está diseñado para equipos comerciales, no para equipos de IT. El setup tarda menos de 10 minutos y no requiere integraciones ni configuraciones complejas. Si podés usar WhatsApp, podés usar ProSell.",
  },
  {
    q: "¿Funciona solo para vehículos o puedo usarlo para otro tipo de productos?",
    a: "ProSell es una plataforma multinicho. Lanzamos con vehículos porque es donde hay más oportunidad de impacto inmediato, pero el sistema funciona igual para inmuebles, maquinaria, productos de alto valor y más. Podés activar nuevos nichos desde la configuración en minutos.",
  },
  {
    q: "¿Cómo funciona el modelo de comisión?",
    a: "Solo pagás cuando cerrás una venta. En el plan Arranque la comisión es del 2% sobre cada venta cerrada a través de la plataforma. En el plan Crecimiento baja al 1.5%. No hay costos ocultos ni cargos si no vendés.",
  },
  {
    q: "¿Puedo migrar mis leads y datos existentes?",
    a: "Sí. ProSell permite importar tu base de contactos y catálogo de productos en formatos CSV y Excel. Tu equipo puede estar operativo con datos reales desde el primer día, sin empezar de cero.",
  },
  {
    q: "¿Qué canales de publicación están disponibles?",
    a: "En el lanzamiento inicial: Facebook Marketplace, AutoTrader, Cars.com y CarGurus para el nicho de vehículos. Estamos agregando portales locales e internacionales según la región. También podés publicar en tu propio sitio web con nuestro widget embebible.",
  },
  {
    q: "¿Qué pasa si quiero cancelar?",
    a: "Podés cancelar cuando quieras, sin penalidades ni períodos mínimos. Tus datos son tuyos — podés exportarlos en cualquier momento en formato CSV o Excel antes de cerrar tu cuenta.",
  },
] as const;
