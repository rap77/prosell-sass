"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { Upload, FileText, X, CheckCircle2, AlertCircle, Download } from "lucide-react"
import { useBulkUploadProducts } from "@/lib/api/vehicles"

interface CSVRecord {
  vin?: string
  year?: string
  make?: string
  model?: string
  trim?: string
  mileage?: string
  price?: string
  condition?: string
  exterior_color?: string
  interior_color?: string
  transmission?: string
  fuel_type?: string
  body_style?: string
  drivetrain?: string
  engine?: string
  cylinders?: string
  description?: string
  [key: string]: string | number | undefined
}

interface ParsedRow extends CSVRecord {
  rowNumber: number
  vin: string
  error?: string
}

interface BulkUploadCSVProps {
  onUpload: (file: File) => Promise<{
    total_rows: number
    created_count: number
    failed_count: number
    errors: Array<{ row_number: number; vin: string; error: string }>
  }>
  onSuccess?: (count: number) => void
  onCancel?: () => void
}

export function BulkUploadCSV({ onUpload, onSuccess, onCancel }: BulkUploadCSVProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([])

  // Use the new products bulk upload hook
  const bulkUpload = useBulkUploadProducts()

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Only CSV files are allowed")
      return
    }

    setFile(selectedFile)
    parseCSV(selectedFile)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  })

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        // Simple CSV parser for preview
        const lines = text.split("\n").filter((line) => line.trim())
        const headers = lines[0].split(",").map((h) => h.trim())

        const rows: ParsedRow[] = lines.slice(1).map((line, index) => {
          const values = line.split(",").map((v) => v.trim())
          const row: any = {
            rowNumber: index + 2, // +2 for header (row 1) and 0-based index
          }

          headers.forEach((header, i) => {
            row[header] = values[i] || ""
          })

          return row as ParsedRow
        })

        // Basic validation
        rows.forEach((row) => {
          if (!row.vin || row.vin.length !== 17) {
            row.error = "VIN must be exactly 17 characters"
          }
        })

        setParsedRows(rows)
        setPreviewRows(rows.slice(0, 5)) // Show first 5 rows
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to parse CSV")
      }
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      // Use the new products bulk upload hook
      const result = await bulkUpload.mutateAsync(file)

      if (result.errors.length > 0) {
        // Mark rows with errors
        const rowsWithErrors = parsedRows.map((row) => {
          const error = result.errors.find((e) => e.row_number === row.rowNumber)
          return { ...row, error: error?.error }
        })
        setParsedRows(rowsWithErrors)
        setPreviewRows(rowsWithErrors.slice(0, 5))
      } else {
        toast.success(`Successfully uploaded ${result.created_count} vehicles`)
        onSuccess?.(result.created_count)
        setFile(null)
        setParsedRows([])
        setPreviewRows([])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload CSV")
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `vin,year,make,model,trim,mileage,price,exterior_color,interior_color,transmission,fuel_type,body_type,drivetrain,engine,cylinders,description
1HGCM82633A123456,2020,Honda,Civic,EX,35000,18500,Black,Black,Automatic,Gas,Sedan,FWD,2.0L 4-Cylinder,4,Well maintained
2T1BURHE0FC123456,2015,Toyota,Camry,SE,80000,12000,White,Grey,Automatic,Gas,Sedan,FWD,2.5L 4-Cylinder,4,Clean title
`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "vehicle_upload_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Upload Vehicles</h2>
          <p className="text-sm text-muted-foreground">
            Upload multiple vehicles from a CSV file
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Template Download */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">CSV Template</p>
            <p className="text-sm text-muted-foreground">
              Download a template with the correct format
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>

      {/* Drop Zone */}
      {!file && (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">
            {isDragActive ? "Drop CSV file here" : "Drag & drop CSV file here"}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedRows.length} rows • {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setParsedRows([])
                setPreviewRows([])
              }}
              className="rounded-md p-2 hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Row</th>
                    <th className="px-4 py-2 text-left font-medium">VIN</th>
                    <th className="px-4 py-2 text-left font-medium">Year</th>
                    <th className="px-4 py-2 text-left font-medium">Make</th>
                    <th className="px-4 py-2 text-left font-medium">Model</th>
                    <th className="px-4 py-2 text-left font-medium">Price</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="px-4 py-2">{row.rowNumber}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.vin}</td>
                      <td className="px-4 py-2">{row.year || "-"}</td>
                      <td className="px-4 py-2">{row.make || "-"}</td>
                      <td className="px-4 py-2">{row.model || "-"}</td>
                      <td className="px-4 py-2">{row.price || "-"}</td>
                      <td className="px-4 py-2">
                        {row.error ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-xs">{row.error}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-xs">Valid</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setParsedRows([])
                setPreviewRows([])
              }}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || parsedRows.some((row) => row.error)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : `Upload ${parsedRows.length} Vehicles`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
