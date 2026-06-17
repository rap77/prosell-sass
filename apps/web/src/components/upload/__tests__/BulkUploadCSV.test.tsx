import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { BulkUploadCSV } from "../BulkUploadCSV";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useBulkUploadProducts
const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();
const mockIsPending = vi.fn(() => false);

vi.mock("@/lib/api/vehicles", () => ({
  useBulkUploadProducts: () => ({
    mutateAsync: mockMutateAsync,
    mutate: mockMutate,
    isPending: mockIsPending(),
  }),
}));

// Mock File.text() method for jsdom environment
Object.defineProperty(File.prototype, "text", {
  writable: true,
  value: function (this: File) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  },
});

// Mock URL.createObjectURL for download template
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("BulkUploadCSV", () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();

    // Reset mocks to default success state
    mockMutateAsync.mockResolvedValue({
      total_rows: 2,
      created_count: 2,
      failed_count: 0,
      errors: [],
    });
    mockIsPending.mockReturnValue(false);
  });

  it("should render dropzone", () => {
    render(<BulkUploadCSV />, { wrapper });

    expect(screen.getByText("Carga masiva de productos")).toBeInTheDocument();
    expect(
      screen.getByText(/Arrastrá y soltá el archivo CSV acá/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Plantilla CSV")).toBeInTheDocument();
  });

  // Subsystem A (G3): BulkUploadCSV is self-sufficient — it owns the
  // upload path via useBulkUploadProducts against the generic
  // POST /api/v1/products/bulk-upload endpoint. There is no onUpload
  // prop (it was dead code: the catalog page was calling a
  // non-existent /api/v1/vehicles/bulk-upload URL, and the prop was
  // never invoked by the component itself).
  it("renders without any props (G3 self-sufficient upload)", () => {
    expect(() => render(<BulkUploadCSV />, { wrapper })).not.toThrow();
  });

  it("should parse CSV file", async () => {
    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500
2T1BURHE0FC123456,2015,Toyota,Camry,12000`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
      expect(screen.getByText(/2 filas/)).toBeInTheDocument();
    });
  });

  it("should show preview table after CSV upload", async () => {
    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Fila")).toBeInTheDocument();
      expect(screen.getByText("VIN")).toBeInTheDocument();
      expect(screen.getByText("Año")).toBeInTheDocument();
      expect(screen.getByText("Marca")).toBeInTheDocument();
      expect(screen.getByText("Modelo")).toBeInTheDocument();
      expect(screen.getByText("Precio")).toBeInTheDocument();
      expect(screen.getByText("Estado")).toBeInTheDocument();
    });
  });

  it("should call useBulkUploadProducts on upload", async () => {
    mockMutateAsync.mockResolvedValue({
      total_rows: 1,
      created_count: 1,
      failed_count: 0,
      errors: [],
    });

    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Subir 1 productos")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText("Subir 1 productos");
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(file);
    });
  });

  it("should display inline errors for failed rows", async () => {
    mockMutateAsync.mockResolvedValue({
      total_rows: 2,
      created_count: 1,
      failed_count: 1,
      errors: [
        {
          row_number: 2,
          vin: "1HGCM82633A004352",
          error: "Invalid VIN checksum",
        },
      ],
    });

    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500
1HGCM82633A004352,2015,Toyota,Camry,12000`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Subir 2 productos")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText("Subir 2 productos");
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid VIN checksum")).toBeInTheDocument();
    });
  });

  it("should validate VIN length in preview", async () => {
    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
SHORT,2020,Honda,Civic,18500`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/El VIN debe tener exactamente 17 caracteres/),
      ).toBeInTheDocument();
    });
  });

  it("should download CSV template", () => {
    render(<BulkUploadCSV />, { wrapper });

    const downloadButton = screen.getByText("Descargar plantilla");
    const clickSpy = vi.fn();
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue({
        href: "",
        download: "",
        click: clickSpy,
        style: {},
      } as any);

    fireEvent.click(downloadButton);

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it("should disable upload button when validation errors exist", async () => {
    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
SHORT,2020,Honda,Civic,18500`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      const uploadButton = screen.getByText("Subir 1 productos");
      expect(uploadButton).toBeDisabled();
    });
  });

  it("should clear file and preview when cancel clicked", async () => {
    render(<BulkUploadCSV />, { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test.csv")).toBeInTheDocument();
    });

    const clearButton = screen.getByText("Limpiar");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText("test.csv")).not.toBeInTheDocument();
      expect(
        screen.getByText(/Arrastrá y soltá el archivo CSV acá/i),
      ).toBeInTheDocument();
    });
  });

  it("should show success toast when upload succeeds", async () => {
    const mockOnSuccess = vi.fn();

    render(<BulkUploadCSV onSuccess={mockOnSuccess} />, { wrapper });

    const csvContent = `vin,year,make,model,price
1HGCM82633A123456,2020,Honda,Civic,18500
2T1BURHE0FC123456,2015,Toyota,Camry,12000`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const input = screen
      .getByRole("presentation")
      .querySelector('input[type="file"]') as HTMLElement;
    fireEvent.drop(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Subir 2 productos")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText("Subir 2 productos");
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Se cargaron 2 productos correctamente",
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(2);
    });
  });
});
