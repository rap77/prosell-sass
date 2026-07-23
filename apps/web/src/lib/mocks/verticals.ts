// ponytail: mock verticals with presentations for UI testing
import type { OrgVerticalsResponse } from "@/types/category";
import { VEHICLE_PRESENTATION } from "./presentations";

export const MOCK_VERTICALS: OrgVerticalsResponse = {
  verticals: [
    {
      id: "vertical-vehicles",
      name: "Vehículos",
      slug: "vehicles",
      presentation: VEHICLE_PRESENTATION,
      categories: [
        {
          id: "cat-vehicles",
          name: "Automóviles",
          slug: "automobiles",
          presentation: VEHICLE_PRESENTATION,
          attribute_schema: {
            year: {
              type: "number",
              filter_type: "range",
              label: "Año",
              validation_rules: { min: 1980, max: 2026 },
            },
            make: {
              type: "string",
              filter_type: "select",
              label: "Marca",
            },
            model: {
              type: "string",
              filter_type: "select",
              label: "Modelo",
            },
            mileage: {
              type: "number",
              filter_type: "range",
              label: "Kilometraje",
              unit: "km",
            },
            fuel_type: {
              type: "string",
              filter_type: "select",
              label: "Combustible",
              options: ["Nafta", "Diesel", "Híbrido", "Eléctrico"],
            },
            transmission: {
              type: "string",
              filter_type: "select",
              label: "Transmisión",
              options: ["Manual", "Automática", "Semi-automática"],
            },
          },
          attribute_groups: [],
          filter_fields: [
            { key: "year", filter_type: "range" },
            { key: "make", filter_type: "select" },
            { key: "model", filter_type: "select" },
            { key: "fuel_type", filter_type: "select" },
            { key: "transmission", filter_type: "select" },
          ],
        },
      ],
    },
  ],
};
